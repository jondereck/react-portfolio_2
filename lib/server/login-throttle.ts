import { getAdminSettings } from '@/lib/server/admin-settings';

type ThrottleState = {
  count: number;
  resetAt: number;
  blockedUntil: number;
  level: number;
  lastFailureAt: number;
};

export type LoginThrottleSnapshot = {
  clientIp: string;
  limit: number;
  remaining: number;
  resetsAt: number;
  isBlocked: boolean;
  blockedUntil?: number;
};

const states = new Map<string, ThrottleState>();

const LEVEL_DECAY_MS = 24 * 60 * 60 * 1000;
const LOCKOUT_SCHEDULE_MS = [60_000, 300_000, 900_000, 3_600_000] as const;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

async function getPolicy() {
  const settings = await getAdminSettings();
  return {
    limit: settings.security.loginRateLimitMax,
    windowMs: settings.security.loginRateLimitWindowSeconds * 1000,
  };
}

function getOrInitState(key: string, now: number, windowMs: number): ThrottleState {
  const existing = states.get(key);
  if (existing) return existing;

  const created: ThrottleState = {
    count: 0,
    resetAt: now + windowMs,
    blockedUntil: 0,
    level: 0,
    lastFailureAt: 0,
  };
  states.set(key, created);
  return created;
}

function normalizeState(state: ThrottleState, now: number, windowMs: number) {
  if (state.lastFailureAt && now - state.lastFailureAt > LEVEL_DECAY_MS) {
    state.count = 0;
    state.resetAt = now + windowMs;
    state.blockedUntil = 0;
    state.level = 0;
    state.lastFailureAt = 0;
    return;
  }

  if (state.blockedUntil && state.blockedUntil <= now) {
    state.count = 0;
    state.resetAt = now + windowMs;
    state.blockedUntil = 0;
  }

  if (!state.resetAt || state.resetAt <= now) {
    state.count = 0;
    state.resetAt = now + windowMs;
  }
}

function snapshotForState(clientIp: string, state: ThrottleState, limit: number, now: number): LoginThrottleSnapshot {
  const remaining = Math.max(0, limit - state.count);
  const isBlocked = state.blockedUntil > now;
  return {
    clientIp,
    limit,
    remaining,
    resetsAt: state.resetAt,
    isBlocked,
    blockedUntil: isBlocked ? state.blockedUntil : undefined,
  };
}

function pickMostRestrictive(a: LoginThrottleSnapshot, b: LoginThrottleSnapshot) {
  if (a.isBlocked || b.isBlocked) {
    const blockedUntil = Math.max(a.blockedUntil ?? 0, b.blockedUntil ?? 0);
    return {
      ...a,
      isBlocked: true,
      blockedUntil,
      remaining: 0,
      resetsAt: Math.max(a.resetsAt, b.resetsAt),
    };
  }

  if (a.remaining !== b.remaining) {
    return a.remaining < b.remaining ? a : b;
  }

  return a.resetsAt <= b.resetsAt ? a : b;
}

export function getLoginThrottleClientIp(request: Request): string {
  return getClientIp(request);
}

export function getLoginThrottleEmail(value: unknown): string | null {
  return normalizeEmail(value);
}

export async function getLoginThrottleStatus(options: {
  request: Request;
  email?: unknown;
  strictEmail?: boolean;
}): Promise<LoginThrottleSnapshot> {
  const { limit, windowMs } = await getPolicy();
  const now = Date.now();
  const clientIp = getClientIp(options.request);

  const ipKey = `ip:${clientIp}`;
  const ipState = getOrInitState(ipKey, now, windowMs);
  normalizeState(ipState, now, windowMs);
  const ipSnapshot = snapshotForState(clientIp, ipState, limit, now);

  if (!options.strictEmail) {
    states.set(ipKey, ipState);
    return ipSnapshot;
  }

  const normalizedEmail = normalizeEmail(options.email);
  if (!normalizedEmail) {
    states.set(ipKey, ipState);
    return ipSnapshot;
  }

  const ipEmailKey = `ipEmail:${clientIp}:${normalizedEmail}`;
  const ipEmailState = getOrInitState(ipEmailKey, now, windowMs);
  normalizeState(ipEmailState, now, windowMs);
  const ipEmailSnapshot = snapshotForState(clientIp, ipEmailState, limit, now);

  states.set(ipKey, ipState);
  states.set(ipEmailKey, ipEmailState);
  return pickMostRestrictive(ipSnapshot, ipEmailSnapshot);
}

export async function recordLoginFailure(options: {
  request: Request;
  email?: unknown;
  strictEmail?: boolean;
}): Promise<LoginThrottleSnapshot> {
  const status = await getLoginThrottleStatus(options);
  if (status.isBlocked) {
    return status;
  }

  const { limit, windowMs } = await getPolicy();
  const now = Date.now();
  const clientIp = getClientIp(options.request);

  const keys: string[] = [`ip:${clientIp}`];
  if (options.strictEmail) {
    const normalizedEmail = normalizeEmail(options.email);
    if (normalizedEmail) {
      keys.push(`ipEmail:${clientIp}:${normalizedEmail}`);
    }
  }

  for (const key of keys) {
    const state = getOrInitState(key, now, windowMs);
    normalizeState(state, now, windowMs);
    state.count += 1;
    state.lastFailureAt = now;
    if (state.count >= limit) {
      const scheduleIndex = Math.min(state.level, LOCKOUT_SCHEDULE_MS.length - 1);
      state.blockedUntil = now + LOCKOUT_SCHEDULE_MS[scheduleIndex];
      state.level = Math.min(state.level + 1, LOCKOUT_SCHEDULE_MS.length);
    }
    states.set(key, state);
  }

  return getLoginThrottleStatus(options);
}

export async function clearLoginFailures(options: { request: Request; email?: unknown; strictEmail?: boolean }): Promise<void> {
  const clientIp = getClientIp(options.request);
  states.delete(`ip:${clientIp}`);

  if (options.strictEmail) {
    const normalizedEmail = normalizeEmail(options.email);
    if (normalizedEmail) {
      states.delete(`ipEmail:${clientIp}:${normalizedEmail}`);
    }
  }
}

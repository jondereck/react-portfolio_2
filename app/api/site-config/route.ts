import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { defaultSiteConfig } from '@/lib/siteContentDefaults';
import { DEFAULT_PORTFOLIO_THEME, isPortfolioThemeId, normalizePortfolioThemeRandomPool } from '@/lib/portfolioThemes';
import { isRateLimited } from '@/lib/server/rate-limit';
import { siteConfigSchema } from '@/lib/validators';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';
import { resolveManagedProfileFromRequest, resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';
import { ensureSiteConfigForProfile } from '@/lib/profile/site-data';
import { createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

export const dynamic = 'force-dynamic';

type ConfigPayload = {
  action?: unknown;
  logoText?: unknown;
  logoImage?: unknown;
  navigation?: unknown;
  portfolioTheme?: unknown;
  portfolioThemeRotationMinutes?: unknown;
  portfolioThemeRandomPool?: unknown;
};

const extractConfigPayload = (input: unknown): ConfigPayload | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const body = input as {
    data?: unknown;
    action?: unknown;
    logoText?: unknown;
    logoImage?: unknown;
    navigation?: unknown;
    portfolioTheme?: unknown;
    portfolioThemeRotationMinutes?: unknown;
    portfolioThemeRandomPool?: unknown;
  };
  if (body.data && typeof body.data === 'object') {
    const nested = body.data as {
      action?: unknown;
      logoText?: unknown;
      logoImage?: unknown;
      navigation?: unknown;
      portfolioTheme?: unknown;
      portfolioThemeRotationMinutes?: unknown;
      portfolioThemeRandomPool?: unknown;
    };
    return {
      action: nested.action,
      logoText: nested.logoText,
      logoImage: nested.logoImage,
      navigation: nested.navigation,
      portfolioTheme: nested.portfolioTheme,
      portfolioThemeRotationMinutes: nested.portfolioThemeRotationMinutes,
      portfolioThemeRandomPool: nested.portfolioThemeRandomPool,
    };
  }

  return {
    action: body.action,
    logoText: body.logoText,
    logoImage: body.logoImage,
    navigation: body.navigation,
    portfolioTheme: body.portfolioTheme,
    portfolioThemeRotationMinutes: body.portfolioThemeRotationMinutes,
    portfolioThemeRandomPool: body.portfolioThemeRandomPool,
  };
};

const ROTATION_STATE_KEY = '__portfolioThemeRotationState';

type RotationStateEntry = {
  currentTheme: string | null;
  lastRotatedAt: string | null;
  nextTheme: string | null;
};

const pickTheme = (pool: string[], previous: string | null) => {
  if (pool.length === 0) return null;
  if (pool.length === 1) return pool[0];
  const candidates = previous ? pool.filter((theme) => theme !== previous) : pool;
  const source = candidates.length > 0 ? candidates : pool;
  return source[Math.floor(Math.random() * source.length)];
};

const getRotationStateMap = (value: Prisma.JsonValue | null | undefined) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, RotationStateEntry>;
};

const getRotationStateMapFromIntegrations = (value: unknown) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const raw = (value as Record<string, unknown>)[ROTATION_STATE_KEY] as Prisma.JsonValue;
  return getRotationStateMap(raw);
};

const parseIsoMs = (value: string | null | undefined) => {
  if (!value) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
};

function resolveRandomThemeRuntime(input: {
  profileId: number;
  portfolioTheme: string;
  portfolioThemeRotationMinutes: number | null;
  portfolioThemeRandomPool: string[];
  stateEntry: RotationStateEntry | null;
  nowMs: number;
  forceRotate: boolean;
  dryRun?: boolean;
}) {
  const warnings: string[] = [];
  if (input.portfolioTheme !== 'random') {
    return {
      activeTheme: isPortfolioThemeId(input.portfolioTheme) ? input.portfolioTheme : DEFAULT_PORTFOLIO_THEME,
      didRotate: false,
      nextState: input.stateEntry,
      status: null as null | Record<string, unknown>,
      warnings,
    };
  }

  const pool = normalizePortfolioThemeRandomPool(input.portfolioThemeRandomPool).filter(isPortfolioThemeId);
  if (pool.length === 0) {
    warnings.push('No random themes are included. Falling back to default theme.');
    return {
      activeTheme: DEFAULT_PORTFOLIO_THEME,
      didRotate: false,
      nextState: input.stateEntry,
      status: {
        mode: 'random',
        intervalMinutes: Math.max(0, Number(input.portfolioThemeRotationMinutes) || 0),
        includedThemes: [],
        includedCount: 0,
        warning: 'No random themes are included. Fallback is active.',
      },
      warnings,
    };
  }

  if (pool.length === 1) {
    warnings.push('Only one theme is included in random mode. Rotation will keep the same theme.');
  }

  const intervalMinutes = Math.max(0, Number(input.portfolioThemeRotationMinutes) || 0);
  const intervalMs = intervalMinutes > 0 ? intervalMinutes * 60 * 1000 : 0;
  const state = input.stateEntry ?? { currentTheme: null, lastRotatedAt: null, nextTheme: null };
  const hasCurrent = Boolean(state.currentTheme && isPortfolioThemeId(state.currentTheme) && pool.includes(state.currentTheme));
  const lastRotatedAtMs = parseIsoMs(state.lastRotatedAt);
  const expired = intervalMs > 0 && (!lastRotatedAtMs || input.nowMs - lastRotatedAtMs >= intervalMs);
  const shouldRotate = input.forceRotate || intervalMs === 0 || !hasCurrent || expired;

  let currentTheme = hasCurrent ? (state.currentTheme as string) : null;
  let lastRotatedAt = lastRotatedAtMs ? new Date(lastRotatedAtMs).toISOString() : null;
  let didRotate = false;

  if (shouldRotate) {
    const picked = pickTheme(pool, hasCurrent ? state.currentTheme : null);
    currentTheme = picked ?? pool[0];
    lastRotatedAt = new Date(input.nowMs).toISOString();
    didRotate = true;
  }

  const resolvedCurrent = currentTheme && isPortfolioThemeId(currentTheme) && pool.includes(currentTheme) ? currentTheme : pool[0];
  const nextCandidate = pickTheme(pool, resolvedCurrent) ?? resolvedCurrent;
  const baseMs = parseIsoMs(lastRotatedAt) ?? input.nowMs;
  const nextRotationAtMs = intervalMs > 0 ? baseMs + intervalMs : null;
  const msUntilNextRotation = nextRotationAtMs ? Math.max(0, nextRotationAtMs - input.nowMs) : null;

  const nextState: RotationStateEntry = {
    currentTheme: resolvedCurrent,
    lastRotatedAt,
    nextTheme: nextCandidate,
  };

  return {
    activeTheme: resolvedCurrent,
    didRotate: !input.dryRun && didRotate,
    nextState,
    status: {
      mode: 'random',
      intervalMinutes,
      includedThemes: pool,
      includedCount: pool.length,
      currentTheme: resolvedCurrent,
      nextTheme: nextCandidate,
      lastRotatedAt,
      nextRotationAt: nextRotationAtMs ? new Date(nextRotationAtMs).toISOString() : null,
      msUntilNextRotation,
      dueNow: intervalMs > 0 ? msUntilNextRotation === 0 : false,
      warning:
        pool.length === 1
          ? 'Only one theme is included in random mode, so rotation cannot switch to another theme.'
          : null,
      note:
        intervalMs === 0
          ? '0 means every public portfolio visit may receive a new random theme.'
          : null,
    },
    warnings,
  };
}

async function updateRotationStateForProfile(profileId: number, state: RotationStateEntry) {
  const adminSettings = await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      integrations: {},
      security: {},
    },
    select: { integrations: true },
  });
  const integrations =
    adminSettings.integrations && typeof adminSettings.integrations === 'object' && !Array.isArray(adminSettings.integrations)
      ? ({ ...adminSettings.integrations } as Record<string, unknown>)
      : {};
  const map = getRotationStateMap(integrations[ROTATION_STATE_KEY] as Prisma.JsonValue);
  map[String(profileId)] = state;
  integrations[ROTATION_STATE_KEY] = map;
  await prisma.adminSettings.update({
    where: { id: 1 },
    data: {
      integrations: integrations as Prisma.InputJsonObject,
    },
  });
}

const normalizeSiteConfig = (
  config: {
    logoText: string | null;
    logoImage: string | null;
    navigation: unknown;
    portfolioTheme?: string | null;
    portfolioThemeRotationMinutes?: number | null;
    portfolioThemeRandomPool?: unknown;
  } | null,
) => {
  const parsed = siteConfigSchema.partial().safeParse({
    logoText: typeof config?.logoText === 'string' ? config.logoText : defaultSiteConfig.logoText,
    logoImage: typeof config?.logoImage === 'string' ? config.logoImage : defaultSiteConfig.logoImage,
    navigation: config?.navigation ?? defaultSiteConfig.navigation,
    portfolioTheme:
      typeof config?.portfolioTheme === 'string' ? config.portfolioTheme : defaultSiteConfig.portfolioTheme,
    portfolioThemeRotationMinutes:
      typeof config?.portfolioThemeRotationMinutes === 'number'
        ? config.portfolioThemeRotationMinutes
        : defaultSiteConfig.portfolioThemeRotationMinutes,
    portfolioThemeRandomPool: normalizePortfolioThemeRandomPool(config?.portfolioThemeRandomPool),
  });

  if (!parsed.success) {
    return defaultSiteConfig;
  }

  return {
    logoText: parsed.data.logoText ?? defaultSiteConfig.logoText,
    logoImage: parsed.data.logoImage ?? defaultSiteConfig.logoImage,
    navigation: parsed.data.navigation ?? defaultSiteConfig.navigation,
    portfolioTheme: parsed.data.portfolioTheme ?? defaultSiteConfig.portfolioTheme,
    portfolioThemeRotationMinutes:
      parsed.data.portfolioThemeRotationMinutes ?? defaultSiteConfig.portfolioThemeRotationMinutes,
    portfolioThemeRandomPool: parsed.data.portfolioThemeRandomPool ?? defaultSiteConfig.portfolioThemeRandomPool,
  };
};

export async function GET(request: Request) {
  const access = await resolvePublicProfileFromRequest(request);
  const profile = access?.profile ?? null;
  if (!profile) {
    return NextResponse.json(defaultSiteConfig);
  }

  await ensureSiteConfigForProfile(profile.id);
  const [config, adminSettings] = await Promise.all([
    prisma.siteConfig.findUnique({ where: { profileId: profile.id } }),
    prisma.adminSettings.findUnique({ where: { id: 1 }, select: { integrations: true } }),
  ]);
  const normalized = normalizeSiteConfig(config);
  const map = getRotationStateMapFromIntegrations(adminSettings?.integrations);
  const currentState = map[String(profile.id)] ?? null;
  const resolved = resolveRandomThemeRuntime({
    profileId: profile.id,
    portfolioTheme: normalized.portfolioTheme,
    portfolioThemeRotationMinutes: normalized.portfolioThemeRotationMinutes ?? 0,
    portfolioThemeRandomPool: normalized.portfolioThemeRandomPool,
    stateEntry: currentState,
    nowMs: Date.now(),
    forceRotate: false,
  });

  if (resolved.didRotate && resolved.nextState) {
    await updateRotationStateForProfile(profile.id, resolved.nextState);
  }

  return NextResponse.json({
    ...normalized,
    activePortfolioTheme: resolved.activeTheme,
    randomThemeStatus: resolved.status,
  });
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return createFormErrorResponse({ error: 'Too many requests. Try again later.', errorCode: 'RATE_LIMITED' }, 429);
  }

  const { actor, profile } = await resolveManagedProfileFromRequest(request).catch(() => ({ actor: null, profile: null }));
  if (!actor || !profile) {
    return createFormErrorResponse({ error: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }, 401);
  }
  if (!canMutateContent(actor.user.role)) {
    return createFormErrorResponse({ error: 'Forbidden', errorCode: 'FORBIDDEN' }, 403);
  }

  try {
    const body = await request.json();
    const payload = extractConfigPayload(body);
    if (!payload) {
      return createFormErrorResponse(
        {
          error: 'Provide at least one site configuration field.',
          errorCode: 'EMPTY_SITE_CONFIG_UPDATE',
        },
        400,
      );
    }

    const parsed = siteConfigSchema.partial().safeParse({
      logoText: typeof payload.logoText === 'string' ? payload.logoText.trim() : payload.logoText,
      logoImage: typeof payload.logoImage === 'string' ? payload.logoImage.trim() : payload.logoImage,
      navigation: payload.navigation,
      portfolioTheme: payload.portfolioTheme,
      portfolioThemeRotationMinutes: payload.portfolioThemeRotationMinutes,
      portfolioThemeRandomPool: payload.portfolioThemeRandomPool,
    });

    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_SITE_CONFIG_PAYLOAD' });
    }

    if (
      !parsed.data.logoText &&
      !parsed.data.logoImage &&
      !parsed.data.navigation &&
      !parsed.data.portfolioTheme &&
      parsed.data.portfolioThemeRotationMinutes === undefined &&
      !parsed.data.portfolioThemeRandomPool
    ) {
      return createFormErrorResponse(
        {
          error: 'Provide at least one site configuration field.',
          errorCode: 'EMPTY_SITE_CONFIG_UPDATE',
        },
        400,
      );
    }

    const current = await prisma.siteConfig.findUnique({ where: { profileId: profile.id } });
    const normalizedCurrent = normalizeSiteConfig(current);
    const updated = await prisma.siteConfig.upsert({
      where: { profileId: profile.id },
      update: {
        logoText: parsed.data.logoText ?? normalizedCurrent.logoText ?? null,
        logoImage: parsed.data.logoImage ?? normalizedCurrent.logoImage ?? null,
        navigation: parsed.data.navigation ?? normalizedCurrent.navigation ?? defaultSiteConfig.navigation,
        portfolioTheme: parsed.data.portfolioTheme ?? normalizedCurrent.portfolioTheme ?? defaultSiteConfig.portfolioTheme,
        portfolioThemeRotationMinutes:
          parsed.data.portfolioThemeRotationMinutes ??
          normalizedCurrent.portfolioThemeRotationMinutes ??
          defaultSiteConfig.portfolioThemeRotationMinutes,
        portfolioThemeRandomPool:
          parsed.data.portfolioThemeRandomPool ??
          normalizedCurrent.portfolioThemeRandomPool ??
          defaultSiteConfig.portfolioThemeRandomPool,
      },
      create: {
        profileId: profile.id,
        logoText: parsed.data.logoText ?? normalizedCurrent.logoText ?? defaultSiteConfig.logoText,
        logoImage: parsed.data.logoImage ?? normalizedCurrent.logoImage ?? null,
        navigation: parsed.data.navigation ?? normalizedCurrent.navigation ?? defaultSiteConfig.navigation,
        portfolioTheme: parsed.data.portfolioTheme ?? normalizedCurrent.portfolioTheme ?? defaultSiteConfig.portfolioTheme,
        portfolioThemeRotationMinutes:
          parsed.data.portfolioThemeRotationMinutes ??
          normalizedCurrent.portfolioThemeRotationMinutes ??
          defaultSiteConfig.portfolioThemeRotationMinutes,
        portfolioThemeRandomPool:
          parsed.data.portfolioThemeRandomPool ??
          normalizedCurrent.portfolioThemeRandomPool ??
          defaultSiteConfig.portfolioThemeRandomPool,
      },
    });

    const requestedAction = typeof payload.action === 'string' ? payload.action : '';
    if (requestedAction === 'rotate_now' || requestedAction === 'preview_next') {
      const normalizedUpdated = normalizeSiteConfig(updated);
      const adminSettings = await prisma.adminSettings.findUnique({ where: { id: 1 }, select: { integrations: true } });
      const map = getRotationStateMapFromIntegrations(adminSettings?.integrations);
      const resolved = resolveRandomThemeRuntime({
        profileId: profile.id,
        portfolioTheme: normalizedUpdated.portfolioTheme,
        portfolioThemeRotationMinutes: normalizedUpdated.portfolioThemeRotationMinutes ?? 0,
        portfolioThemeRandomPool: normalizedUpdated.portfolioThemeRandomPool,
        stateEntry: map[String(profile.id)] ?? null,
        nowMs: Date.now(),
        forceRotate: requestedAction === 'rotate_now',
        dryRun: requestedAction === 'preview_next',
      });

      if (requestedAction === 'rotate_now' && resolved.nextState) {
        await updateRotationStateForProfile(profile.id, resolved.nextState);
      }

      return NextResponse.json({
        ...normalizedUpdated,
        activePortfolioTheme: resolved.activeTheme,
        randomThemeStatus: resolved.status,
      });
    }

    await logAdminAuditEvent({
      actorUserId: actor.user.id,
      targetProfileId: profile.id,
      type: 'settings_updated',
      details: {
        scope: [
          parsed.data.navigation ? 'navigation' : null,
          parsed.data.logoText !== undefined || parsed.data.logoImage !== undefined ? 'branding' : null,
          parsed.data.portfolioTheme !== undefined ? 'portfolio_theme' : null,
          parsed.data.portfolioThemeRotationMinutes !== undefined ? 'portfolio_theme_rotation' : null,
          parsed.data.portfolioThemeRandomPool !== undefined ? 'portfolio_theme_random_pool' : null,
        ].filter(Boolean),
      },
    });

    const normalizedUpdated = normalizeSiteConfig(updated);
    const adminSettings = await prisma.adminSettings.findUnique({ where: { id: 1 }, select: { integrations: true } });
    const map = getRotationStateMapFromIntegrations(adminSettings?.integrations);
    const resolved = resolveRandomThemeRuntime({
      profileId: profile.id,
      portfolioTheme: normalizedUpdated.portfolioTheme,
      portfolioThemeRotationMinutes: normalizedUpdated.portfolioThemeRotationMinutes ?? 0,
      portfolioThemeRandomPool: normalizedUpdated.portfolioThemeRandomPool,
      stateEntry: map[String(profile.id)] ?? null,
      nowMs: Date.now(),
      forceRotate: false,
    });

    return NextResponse.json({
      ...normalizedUpdated,
      activePortfolioTheme: resolved.activeTheme,
      randomThemeStatus: resolved.status,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    console.error('Failed to update site config', error);
    if (error instanceof SyntaxError) {
      return createFormErrorResponse({ error: 'Malformed JSON request body.', errorCode: 'MALFORMED_JSON' }, 400);
    }
    return createFormErrorResponse({ error: 'Unable to update site configuration.', errorCode: 'SITE_CONFIG_UPDATE_FAILED' }, 500);
  }
}

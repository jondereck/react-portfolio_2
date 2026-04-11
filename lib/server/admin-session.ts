import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 hours

const textEncoder = new TextEncoder();

const base64UrlEncode = (value: string) => Buffer.from(value).toString('base64url');
const base64UrlDecode = (value: string) => Buffer.from(value, 'base64url').toString('utf8');

const getSessionSecret = () => {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_KEY || '';
};

const safeEqual = (left: string, right: string): boolean => {
  const leftBytes = textEncoder.encode(left);
  const rightBytes = textEncoder.encode(right);
  if (leftBytes.length !== rightBytes.length) {
    return false;
  }

  return timingSafeEqual(leftBytes, rightBytes);
};

const signPayload = (payload: string, secret: string) => {
  return createHmac('sha256', secret).update(payload).digest('base64url');
};

const parseCookies = (request: Request) => {
  const raw = request.headers.get('cookie');
  if (!raw) {
    return {};
  }

  return raw.split(';').reduce<Record<string, string>>((acc, entry) => {
    const [key, ...rest] = entry.split('=');
    if (!key || rest.length === 0) {
      return acc;
    }

    acc[key.trim()] = decodeURIComponent(rest.join('=').trim());
    return acc;
  }, {});
};

export function createAdminSessionToken(): string | null {
  const secret = getSessionSecret();
  if (!secret) {
    return null;
  }

  const payload = base64UrlEncode(
    JSON.stringify({
      exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    }),
  );
  const signature = signPayload(payload, secret);
  return `${payload}.${signature}`;
}

export function isValidAdminSessionToken(token: string): boolean {
  const secret = getSessionSecret();
  if (!secret || !token) {
    return false;
  }

  const [payload, signature] = token.split('.');
  if (!payload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(payload, secret);
  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as { exp?: number };
    if (typeof decoded.exp !== 'number') {
      return false;
    }

    return decoded.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export function hasValidAdminSession(request: Request): boolean {
  const cookies = parseCookies(request);
  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) {
    return false;
  }

  return isValidAdminSessionToken(token);
}

export function setAdminSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}


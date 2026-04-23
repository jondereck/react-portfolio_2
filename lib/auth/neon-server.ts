import { createNeonAuth } from '@neondatabase/auth/next/server';

let neonAuthInstance: ReturnType<typeof createNeonAuth> | null | undefined;

export function isNeonAuthConfigured() {
  return Boolean(process.env.NEON_AUTH_BASE_URL && process.env.NEON_AUTH_COOKIE_SECRET);
}

export function getNeonAuthConfigError() {
  if (!process.env.NEON_AUTH_BASE_URL) {
    return 'NEON_AUTH_BASE_URL is not configured.';
  }

  if (!process.env.NEON_AUTH_COOKIE_SECRET) {
    return 'NEON_AUTH_COOKIE_SECRET is not configured.';
  }

  if (process.env.NEON_AUTH_COOKIE_SECRET.length < 32) {
    return 'NEON_AUTH_COOKIE_SECRET must be at least 32 characters.';
  }

  return null;
}

export function getNeonAuth() {
  const error = getNeonAuthConfigError();
  if (error) {
    return null;
  }

  if (neonAuthInstance !== undefined) {
    return neonAuthInstance;
  }

  neonAuthInstance = createNeonAuth({
    baseUrl: process.env.NEON_AUTH_BASE_URL!,
    cookies: {
      secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    },
  });

  return neonAuthInstance;
}

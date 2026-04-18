import { prisma } from '@/lib/prisma';

export const GOOGLE_DRIVE_PROVIDER = 'google';
export const GOOGLE_DRIVE_LINK_COOKIE = 'admin_google_drive_link_user';

const ACCESS_TOKEN_REFRESH_BUFFER_SECONDS = 60;

type GoogleTokenRefreshResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
};

export function isGoogleDriveOAuthConfigured() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export async function getGoogleDriveAccountForUser(userId: string) {
  return prisma.account.findFirst({
    where: {
      userId,
      provider: GOOGLE_DRIVE_PROVIDER,
    },
  });
}

export async function getGoogleDriveConnectionStatusForUser(userId: string) {
  const account = await getGoogleDriveAccountForUser(userId);

  return {
    connected: Boolean(account),
    expiresAt: account?.expires_at ?? null,
    hasRefreshToken: Boolean(account?.refresh_token),
    scope: account?.scope ?? null,
  };
}

export async function disconnectGoogleDriveAccountForUser(userId: string) {
  await prisma.account.deleteMany({
    where: {
      userId,
      provider: GOOGLE_DRIVE_PROVIDER,
    },
  });
}

async function refreshGoogleDriveAccessToken(account: NonNullable<Awaited<ReturnType<typeof getGoogleDriveAccountForUser>>>) {
  if (!account.refresh_token) {
    throw new Error('GOOGLE_DRIVE_RECONNECT_REQUIRED');
  }

  if (!isGoogleDriveOAuthConfigured()) {
    throw new Error('GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
      refresh_token: account.refresh_token,
    }),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('GOOGLE_DRIVE_TOKEN_REFRESH_FAILED');
  }

  const payload = (await response.json()) as GoogleTokenRefreshResponse;
  if (!payload.access_token) {
    throw new Error('GOOGLE_DRIVE_TOKEN_REFRESH_FAILED');
  }

  const expiresAt = payload.expires_in ? Math.floor(Date.now() / 1000) + payload.expires_in : null;

  const updated = await prisma.account.update({
    where: {
      provider_providerAccountId: {
        provider: account.provider,
        providerAccountId: account.providerAccountId,
      },
    },
    data: {
      access_token: payload.access_token,
      expires_at: expiresAt,
      refresh_token: payload.refresh_token ?? account.refresh_token,
      scope: payload.scope ?? account.scope,
      token_type: payload.token_type ?? account.token_type,
    },
  });

  return updated.access_token;
}

export async function getGoogleDriveAccessTokenForUser(userId: string) {
  const account = await getGoogleDriveAccountForUser(userId);
  if (!account) {
    throw new Error('GOOGLE_DRIVE_NOT_CONNECTED');
  }

  return resolveAccessTokenFromAccount(account);
}

async function getFallbackGoogleDriveAccount() {
  return prisma.account.findFirst({
    where: {
      provider: GOOGLE_DRIVE_PROVIDER,
      user: {
        isActive: true,
      },
    },
    orderBy: [{ userId: 'asc' }, { providerAccountId: 'asc' }],
  });
}

async function resolveAccessTokenFromAccount(account: NonNullable<Awaited<ReturnType<typeof getGoogleDriveAccountForUser>>>) {
  const now = Math.floor(Date.now() / 1000);
  const tokenIsFresh =
    typeof account.expires_at !== 'number' ||
    account.expires_at > now + ACCESS_TOKEN_REFRESH_BUFFER_SECONDS;

  if (account.access_token && tokenIsFresh) {
    return account.access_token;
  }

  const refreshedAccessToken = await refreshGoogleDriveAccessToken(account);
  if (!refreshedAccessToken) {
    throw new Error('GOOGLE_DRIVE_RECONNECT_REQUIRED');
  }

  return refreshedAccessToken;
}

export async function getGoogleDriveAccessTokenForUserOrAny(userId?: string | null) {
  if (userId) {
    const preferredAccount = await getGoogleDriveAccountForUser(userId);
    if (preferredAccount) {
      return resolveAccessTokenFromAccount(preferredAccount);
    }
  }

  const fallbackAccount = await getFallbackGoogleDriveAccount();
  if (!fallbackAccount) {
    throw new Error('GOOGLE_DRIVE_NOT_CONNECTED');
  }

  return resolveAccessTokenFromAccount(fallbackAccount);
}

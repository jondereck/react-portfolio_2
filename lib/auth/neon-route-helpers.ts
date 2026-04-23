import { prisma } from '@/lib/prisma';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type NeonAction =
  | 'sign-in'
  | 'sign-up'
  | 'google'
  | 'send-code'
  | 'verify-code'
  | 'forgot-password'
  | 'reset-password'
  | 'sign-out';

type EmailRow = {
  email: string;
};

export function isLikelyEmail(value: string) {
  return emailPattern.test(value.trim());
}

export function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export async function resolveNeonSignInEmail(identifier: string) {
  const normalized = identifier.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (isLikelyEmail(normalized)) {
    return normalized;
  }

  const profile = await prisma.profile.findUnique({
    where: { slug: normalized },
    select: {
      user: {
        select: {
          email: true,
        },
      },
    },
  });

  if (profile?.user?.email) {
    return normalizeEmail(profile.user.email);
  }

  const localPartMatches = await prisma.$queryRaw<EmailRow[]>`
    SELECT email
    FROM "User"
    WHERE split_part(lower(email), '@', 1) = ${normalized}
    LIMIT 2
  `;

  if (localPartMatches.length === 1) {
    return normalizeEmail(localPartMatches[0].email);
  }

  return null;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'string' && error.trim()) {
    return error;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function mapNeonAuthError(error: unknown, action: NeonAction) {
  const message = getErrorMessage(error, 'Neon auth request failed.');

  if (/too many attempts|rate limit|try again later/i.test(message)) {
    return {
      body: { error: 'Too many attempts. Try again later.', errorCode: 'TOO_MANY_ATTEMPTS' },
      status: 429,
    };
  }

  if (/invalid email or password|invalid password|invalid credentials/i.test(message)) {
    return {
      body: {
        error: action === 'sign-in' ? 'Invalid credentials.' : 'Unable to verify those credentials.',
        errorCode: 'INVALID_CREDENTIALS',
      },
      status: 401,
    };
  }

  if (/invalid otp|invalid code|invalid token|verification code is invalid/i.test(message)) {
    return {
      body: { error: 'Invalid verification code.', errorCode: 'INVALID_CODE' },
      status: 400,
    };
  }

  if (/expired otp|expired code|otp has expired|token has expired/i.test(message)) {
    return {
      body: { error: 'That code has expired. Request a new one.', errorCode: 'EXPIRED_CODE' },
      status: 400,
    };
  }

  if (/user already exists|email already exists|already registered|already in use/i.test(message)) {
    return {
      body: { error: 'That email is already in use.', errorCode: 'EMAIL_IN_USE' },
      status: 409,
    };
  }

  if (/user not found|email not found|account not found/i.test(message)) {
    if (action === 'forgot-password') {
      return {
        body: {
          ok: true,
          message: 'If that email exists, a reset code has been sent.',
        },
        status: 200,
      };
    }

    return {
      body: { error: 'Unable to find that account.', errorCode: 'ACCOUNT_NOT_FOUND' },
      status: 404,
    };
  }

  const defaultMessages: Record<NeonAction, string> = {
    'forgot-password': 'Unable to send a reset code.',
    google: 'Unable to start Google sign-in.',
    'reset-password': 'Unable to reset your password.',
    'send-code': 'Unable to send a sign-in code.',
    'sign-in': 'Unable to sign in with Neon.',
    'sign-out': 'Unable to sign out from Neon.',
    'sign-up': 'Unable to create your Neon account.',
    'verify-code': 'Unable to verify that sign-in code.',
  };

  return {
    body: {
      error: message || defaultMessages[action],
      errorCode: 'NEON_AUTH_FAILED',
    },
    status: 400,
  };
}

export function getNeonResultData<T>(result: { data?: T; error?: unknown } | null | undefined) {
  return result?.data ?? null;
}

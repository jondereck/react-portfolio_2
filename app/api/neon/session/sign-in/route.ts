import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { normalizeProtectedPath } from '@/lib/auth/redirects';

const signInSchema = z.object({
  callbackUrl: z.string().trim().optional(),
  email: z.string().trim().email().max(120),
  password: z.string().min(1).max(200),
});

function mapNeonAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Unable to sign in with Neon.';

  if (/too many attempts/i.test(message)) {
    return {
      body: { error: 'Too many attempts. Try again later.', errorCode: 'TOO_MANY_ATTEMPTS' },
      status: 429,
    };
  }

  if (/invalid email or password|invalid password|invalid email/i.test(message)) {
    return {
      body: { error: 'Invalid Neon credentials.', errorCode: 'INVALID_CREDENTIALS' },
      status: 401,
    };
  }

  return {
    body: { error: message || 'Unable to sign in with Neon.', errorCode: 'NEON_SIGN_IN_FAILED' },
    status: 400,
  };
}

export async function POST(request: Request) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const parsed = signInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Provide a valid email and password.', errorCode: 'INVALID_SIGN_IN_PAYLOAD' },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectTo = normalizeProtectedPath(parsed.data.callbackUrl, origin) ?? '/admin';

  try {
    const result = await auth.signIn.email({
      email: parsed.data.email.trim().toLowerCase(),
      password: parsed.data.password,
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error);
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({ ok: true, redirectTo });
  } catch (error) {
    const mapped = mapNeonAuthError(error);
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

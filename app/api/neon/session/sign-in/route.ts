import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { mapNeonAuthError, resolveNeonSignInEmail } from '@/lib/auth/neon-route-helpers';
import { normalizeProtectedPath } from '@/lib/auth/redirects';

const signInSchema = z.object({
  callbackUrl: z.string().trim().optional(),
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(200),
  rememberMe: z.boolean().optional(),
});

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
      { error: 'Provide a valid email or username and password.', errorCode: 'INVALID_SIGN_IN_PAYLOAD' },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectTo = normalizeProtectedPath(parsed.data.callbackUrl, origin) ?? '/admin';
  const email = await resolveNeonSignInEmail(parsed.data.identifier);
  if (!email) {
    return NextResponse.json({ error: 'Invalid credentials.', errorCode: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  try {
    const result = await auth.signIn.email({
      email,
      password: parsed.data.password,
      callbackURL: redirectTo,
      rememberMe: parsed.data.rememberMe ?? false,
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error, 'sign-in');
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({ ok: true, redirectTo });
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'sign-in');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

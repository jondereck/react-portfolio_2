import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { mapNeonAuthError, normalizeEmail } from '@/lib/auth/neon-route-helpers';
import { normalizeProtectedPath } from '@/lib/auth/redirects';

const signUpSchema = z.object({
  callbackUrl: z.string().trim().optional(),
  email: z.string().trim().email().max(120),
  name: z.string().trim().min(2).max(80),
  password: z.string().min(8).max(200),
});

export async function POST(request: Request) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const parsed = signUpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Provide your full name, email, and password.', errorCode: 'INVALID_SIGN_UP_PAYLOAD' },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectTo = normalizeProtectedPath(parsed.data.callbackUrl, origin) ?? '/admin/login';
  const callbackURL = new URL(redirectTo, origin).toString();

  try {
    const result = await auth.signUp.email({
      email: normalizeEmail(parsed.data.email),
      name: parsed.data.name.trim(),
      password: parsed.data.password,
      callbackURL,
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error, 'sign-up');
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({
      ok: true,
      message: 'Account created. Wait for admin approval before using the workspace.',
      redirectTo,
    });
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'sign-up');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

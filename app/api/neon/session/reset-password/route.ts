import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { mapNeonAuthError, normalizeEmail } from '@/lib/auth/neon-route-helpers';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';

const resetPasswordSchema = z.object({
  email: z.string().trim().email().max(120),
  otp: z.string().trim().min(4).max(12),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function POST(request: Request) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const parsed = resetPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Use a valid code and a password with at least ${MIN_PASSWORD_LENGTH} characters.`, errorCode: 'INVALID_RESET_PASSWORD_PAYLOAD' },
      { status: 400 },
    );
  }

  try {
    const result = await auth.emailOtp.resetPassword({
      email: normalizeEmail(parsed.data.email),
      otp: parsed.data.otp.trim(),
      password: parsed.data.password,
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error, 'reset-password');
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({ ok: true, message: 'Password updated. You can sign in now.' });
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'reset-password');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

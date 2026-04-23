import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { mapNeonAuthError, normalizeEmail } from '@/lib/auth/neon-route-helpers';

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(120),
});

export async function POST(request: Request) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const parsed = forgotPasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide a valid email address.', errorCode: 'INVALID_FORGOT_PASSWORD_PAYLOAD' }, { status: 400 });
  }

  try {
    const result = await auth.emailOtp.sendVerificationOtp({
      email: normalizeEmail(parsed.data.email),
      type: 'forget-password',
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error, 'forgot-password');
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({ ok: true, message: 'If that email exists, a reset code has been sent.' });
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'forgot-password');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

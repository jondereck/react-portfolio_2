import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { mapNeonAuthError, normalizeEmail } from '@/lib/auth/neon-route-helpers';
import { normalizeProtectedPath } from '@/lib/auth/redirects';

const verifyCodeSchema = z.object({
  callbackUrl: z.string().trim().optional(),
  email: z.string().trim().email().max(120),
  otp: z.string().trim().min(4).max(12),
});

export async function POST(request: Request) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const parsed = verifyCodeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Provide your email and code.', errorCode: 'INVALID_VERIFY_CODE_PAYLOAD' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const redirectTo = normalizeProtectedPath(parsed.data.callbackUrl, origin) ?? '/admin';

  try {
    // @neondatabase/auth exposes this endpoint, but the `signIn` typings currently
    // don't include `emailOtp` on the server client.
    const result = await (auth as any).signIn.emailOtp({
      email: normalizeEmail(parsed.data.email),
      otp: parsed.data.otp.trim(),
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error, 'verify-code');
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    return NextResponse.json({ ok: true, redirectTo });
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'verify-code');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

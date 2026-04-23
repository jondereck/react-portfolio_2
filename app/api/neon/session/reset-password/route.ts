import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { mapNeonAuthError, normalizeEmail, normalizeOtp } from '@/lib/auth/neon-route-helpers';
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
    // Use the Neon Auth handler proxy so required headers/cookies are preserved.
    const handler = auth.handler();
    const origin = new URL(request.url).origin;
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('content-type', 'application/json');
    proxyHeaders.set('origin', origin);

    const proxyRequest = new Request(new URL('/api/neon-auth/email-otp/reset-password', request.url), {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({
        email: normalizeEmail(parsed.data.email),
        otp: normalizeOtp(parsed.data.otp),
        password: parsed.data.password,
      }),
    });

    const proxyResponse = await handler.POST(proxyRequest, {
      params: Promise.resolve({ path: ['email-otp', 'reset-password'] }),
    });

    const proxyPayload = await proxyResponse.json().catch(() => null);
    if (!proxyResponse.ok) {
      const mapped = mapNeonAuthError(proxyPayload ?? proxyResponse.statusText, 'reset-password');
      const outgoing = NextResponse.json(mapped.body, { status: mapped.status });
      for (const setCookie of proxyResponse.headers.getSetCookie()) {
        outgoing.headers.append('set-cookie', setCookie);
      }
      return outgoing;
    }

    const outgoing = NextResponse.json({ ok: true, message: 'Password updated. You can sign in now.' });
    for (const setCookie of proxyResponse.headers.getSetCookie()) {
      outgoing.headers.append('set-cookie', setCookie);
    }
    return outgoing;
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'reset-password');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

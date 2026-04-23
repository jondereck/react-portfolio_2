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
    const handler = auth.handler();
    const origin = new URL(request.url).origin;
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('content-type', 'application/json');
    proxyHeaders.set('origin', origin);

    const proxyRequest = new Request(new URL('/api/neon-auth/forget-password/email-otp', request.url), {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({
        email: normalizeEmail(parsed.data.email),
      }),
    });

    const proxyResponse = await handler.POST(proxyRequest, {
      params: Promise.resolve({ path: ['forget-password', 'email-otp'] }),
    });

    const proxyPayload = await proxyResponse.json().catch(() => null);
    if (!proxyResponse.ok) {
      const mapped = mapNeonAuthError(proxyPayload ?? proxyResponse.statusText, 'forgot-password');
      const outgoing = NextResponse.json(mapped.body, { status: mapped.status });
      for (const setCookie of proxyResponse.headers.getSetCookie()) {
        outgoing.headers.append('set-cookie', setCookie);
      }
      return outgoing;
    }

    const outgoing = NextResponse.json({ ok: true, message: 'If that email exists, a reset code has been sent.' });
    for (const setCookie of proxyResponse.headers.getSetCookie()) {
      outgoing.headers.append('set-cookie', setCookie);
    }
    return outgoing;
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'forgot-password');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

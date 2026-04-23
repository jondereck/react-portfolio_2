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
  const callbackURL = new URL(redirectTo, origin).toString();
  const email = await resolveNeonSignInEmail(parsed.data.identifier);
  if (!email) {
    return NextResponse.json({ error: 'Invalid credentials.', errorCode: 'INVALID_CREDENTIALS' }, { status: 401 });
  }

  try {
    // Use the Neon Auth handler proxy so Origin is always set (it falls back to
    // `request.url` origin), even if the incoming request doesn't include
    // Origin/Referer headers.
    const handler = auth.handler();
    const proxyHeaders = new Headers(request.headers);
    proxyHeaders.set('content-type', 'application/json');

    const proxyRequest = new Request(new URL('/api/neon-auth/sign-in/email', request.url), {
      method: 'POST',
      headers: proxyHeaders,
      body: JSON.stringify({
        email,
        password: parsed.data.password,
        callbackURL,
        rememberMe: parsed.data.rememberMe ?? false,
      }),
    });

    const proxyResponse = await handler.POST(proxyRequest, {
      params: Promise.resolve({ path: ['sign-in', 'email'] }),
    });

    const proxyPayload = await proxyResponse.json().catch(() => null);

    const outgoing = NextResponse.json(
      proxyResponse.ok ? { ok: true, redirectTo } : mapNeonAuthError(proxyPayload, 'sign-in').body,
      { status: proxyResponse.ok ? 200 : mapNeonAuthError(proxyPayload, 'sign-in').status },
    );

    for (const setCookie of proxyResponse.headers.getSetCookie()) {
      outgoing.headers.append('set-cookie', setCookie);
    }

    for (const headerName of ['set-auth-jwt', 'set-auth-token', 'x-neon-ret-request-id']) {
      const value = proxyResponse.headers.get(headerName);
      if (value) {
        outgoing.headers.set(headerName, value);
      }
    }

    return outgoing;
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'sign-in');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

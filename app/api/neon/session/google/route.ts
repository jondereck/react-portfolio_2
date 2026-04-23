import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';
import { getNeonResultData, mapNeonAuthError } from '@/lib/auth/neon-route-helpers';
import { normalizeProtectedPath } from '@/lib/auth/redirects';

const googleSchema = z.object({
  callbackUrl: z.string().trim().optional(),
  mode: z.enum(['sign-in', 'sign-up']).optional(),
});

export async function POST(request: Request) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const parsed = googleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid Google auth request.', errorCode: 'INVALID_GOOGLE_PAYLOAD' }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const callbackUrl = normalizeProtectedPath(parsed.data.callbackUrl, origin) ?? '/admin';

  try {
    const result = await auth.signIn.social({
      provider: 'google',
      callbackURL: callbackUrl,
      disableRedirect: true,
      requestSignUp: parsed.data.mode === 'sign-up',
    });

    if (result?.error) {
      const mapped = mapNeonAuthError(result.error, 'google');
      return NextResponse.json(mapped.body, { status: mapped.status });
    }

    const data = getNeonResultData<{ url?: string }>(result);
    if (!data?.url) {
      return NextResponse.json(
        { error: 'Unable to start Google sign-in.', errorCode: 'GOOGLE_REDIRECT_MISSING' },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true, redirectTo: data.url });
  } catch (error) {
    const mapped = mapNeonAuthError(error, 'google');
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

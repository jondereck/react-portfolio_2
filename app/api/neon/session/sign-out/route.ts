import { NextResponse } from 'next/server';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';

export async function POST() {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  try {
    const result = await auth.signOut();
    if (result?.error) {
      return NextResponse.json(
        { error: result.error.message || 'Unable to sign out from Neon.', errorCode: 'NEON_SIGN_OUT_FAILED' },
        { status: 400 },
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unable to sign out from Neon.',
        errorCode: 'NEON_SIGN_OUT_FAILED',
      },
      { status: 400 },
    );
  }
}

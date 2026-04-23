import { NextResponse } from 'next/server';
import { getCurrentAuthStatus } from '@/lib/auth/session';

export async function GET(request: Request) {
  try {
    const status = await getCurrentAuthStatus(request);

    return NextResponse.json({
      authenticated: status.authenticated,
      errorCode: status.errorCode,
      neonConfigured: status.neonConfigured,
      source: status.source,
      state: status.state,
    });
  } catch {
    return NextResponse.json(
      {
        authenticated: false,
        errorCode: 'AUTH_STATUS_FAILED',
        neonConfigured: false,
        source: null,
        state: 'anonymous',
      },
      { status: 500 },
    );
  }
}

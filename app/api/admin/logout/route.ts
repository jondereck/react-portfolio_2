import { NextResponse } from 'next/server';
import { clearAdminSessionCookie, hasValidAdminSession } from '@/lib/server/admin-session';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';

export async function POST(request: Request) {
  const hadSession = await hasValidAdminSession(request);
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  if (hadSession) {
    await logAdminAuditEvent({ type: 'logout' });
  }
  return response;
}

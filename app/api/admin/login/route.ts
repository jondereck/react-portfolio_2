import { NextResponse } from 'next/server';
import { createAdminSessionToken, setAdminSessionCookie } from '@/lib/server/admin-session';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { isValidAdminKey } from '@/lib/adminAuth';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-login', 10, 60_000)) {
    await logAdminAuditEvent({ type: 'login_failure', details: { reason: 'rate_limited' } });
    return NextResponse.json({ ok: false, error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body.' }, { status: 400 });
  }

  const key = isRecord(payload) ? payload.key : undefined;
  if (!isNonEmptyString(key)) {
    await logAdminAuditEvent({ type: 'login_failure', details: { reason: 'missing_key' } });
    return NextResponse.json({ ok: false, error: 'Admin key is required.' }, { status: 400 });
  }

  if (!isValidAdminKey(key.trim())) {
    await logAdminAuditEvent({ type: 'login_failure', details: { reason: 'invalid_credentials' } });
    return NextResponse.json({ ok: false, error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = await createAdminSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Admin auth is not configured.' }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  await setAdminSessionCookie(response, token);
  await logAdminAuditEvent({ type: 'login_success' });
  return response;
}

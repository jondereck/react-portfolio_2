import { NextResponse } from 'next/server';
import { createAdminSessionToken, setAdminSessionCookie } from '@/lib/server/admin-session';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';
import { clearLoginFailures, getLoginThrottleStatus, recordLoginFailure } from '@/lib/server/login-throttle';
import { isValidAdminKey } from '@/lib/adminAuth';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export async function POST(request: Request) {
  const throttleStatus = await getLoginThrottleStatus({ request });
  if (throttleStatus.isBlocked && throttleStatus.blockedUntil) {
    await logAdminAuditEvent({
      type: 'login_failure',
      details: {
        reason: 'locked_out',
        clientIp: throttleStatus.clientIp,
        blockedUntil: throttleStatus.blockedUntil,
      },
    });
    return NextResponse.json(
      {
        ok: false,
        error: 'Too many attempts. Try again later.',
        rateLimit: {
          blockedUntil: throttleStatus.blockedUntil,
          retryAtIso: new Date(throttleStatus.blockedUntil).toISOString(),
        },
      },
      { status: 429 },
    );
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
    const updated = await recordLoginFailure({ request });
    if (updated.isBlocked && updated.blockedUntil) {
      await logAdminAuditEvent({
        type: 'login_failure',
        details: {
          reason: 'locked_out',
          clientIp: updated.clientIp,
          blockedUntil: updated.blockedUntil,
        },
      });
      return NextResponse.json(
        {
          ok: false,
          error: 'Too many attempts. Try again later.',
          rateLimit: {
            blockedUntil: updated.blockedUntil,
            retryAtIso: new Date(updated.blockedUntil).toISOString(),
          },
        },
        { status: 429 },
      );
    }

    const warningText =
      updated.remaining <= 3 ? ` Invalid credentials. ${updated.remaining} retries left before temporary lockout.` : ' Invalid credentials.';

    await logAdminAuditEvent({
      type: 'login_failure',
      details: {
        reason: 'invalid_credentials',
        clientIp: updated.clientIp,
        remaining: updated.remaining,
      },
    });

    return NextResponse.json(
      {
        ok: false,
        error: warningText.trim(),
        rateLimit: {
          remaining: updated.remaining,
          limit: updated.limit,
          resetsAtIso: new Date(updated.resetsAt).toISOString(),
        },
      },
      { status: 401 },
    );
  }

  const token = await createAdminSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Admin auth is not configured.' }, { status: 503 });
  }

  await clearLoginFailures({ request });
  const response = NextResponse.json({ ok: true });
  await setAdminSessionCookie(response, token);
  await logAdminAuditEvent({ type: 'login_success' });
  return response;
}

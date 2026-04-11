import { NextResponse } from 'next/server';
import { createAdminSessionToken, setAdminSessionCookie } from '@/lib/server/admin-session';
import { isRateLimited } from '@/lib/server/rate-limit';
import { isValidAdminKey } from '@/lib/adminAuth';

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

export async function POST(request: Request) {
  if (isRateLimited(request, 'admin-login', 10, 60_000)) {
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
    return NextResponse.json({ ok: false, error: 'Admin key is required.' }, { status: 400 });
  }

  if (!isValidAdminKey(key.trim())) {
    return NextResponse.json({ ok: false, error: 'Invalid credentials.' }, { status: 401 });
  }

  const token = createAdminSessionToken();
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Admin auth is not configured.' }, { status: 503 });
  }

  const response = NextResponse.json({ ok: true });
  setAdminSessionCookie(response, token);
  return response;
}


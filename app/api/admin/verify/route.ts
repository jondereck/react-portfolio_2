import { NextResponse } from 'next/server';

const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export async function POST(request: Request) {
  const configuredKey = process.env.ADMIN_API_KEY;
  if (!isNonEmptyString(configuredKey)) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const providedKey = isRecord(payload) ? payload.key : undefined;
  if (!isNonEmptyString(providedKey)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const isValid = providedKey === configuredKey;
  if (!isValid) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

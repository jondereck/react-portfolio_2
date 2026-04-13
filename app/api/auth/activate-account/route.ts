import { NextResponse } from 'next/server';
import { z } from 'zod';
import { activateManagedUser, validateActivationToken } from '@/lib/auth/user-management';

const activationSchema = z.object({
  email: z.string().trim().email().max(120),
  token: z.string().trim().min(16).max(256),
  password: z.string().trim().min(12).max(200),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const validation = await validateActivationToken(email, token);
  if (!validation.ok) {
    return NextResponse.json({ ok: false, reason: validation.reason }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    user: validation.user,
    expires: validation.expires,
  });
}

export async function POST(request: Request) {
  try {
    const parsed = activationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid activation payload.' }, { status: 400 });
    }

    const { email, token, password } = parsed.data;
    const result = await activateManagedUser({ email, token, password });
    return NextResponse.json({ ok: true, user: result });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'INVALID_TOKEN') {
        return NextResponse.json({ error: 'Invalid activation link.' }, { status: 400 });
      }
      if (error.message === 'TOKEN_EXPIRED') {
        return NextResponse.json({ error: 'Activation link expired.' }, { status: 400 });
      }
      if (error.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
      }
      if (error.message.includes('Password must be at least')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unable to activate account.' }, { status: 500 });
  }
}

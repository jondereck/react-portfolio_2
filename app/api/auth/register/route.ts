import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerPendingUser } from '@/lib/auth/user-management';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().trim().min(12).max(200),
});

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid registration payload.' }, { status: 400 });
    }

    const { name, email, password } = parsed.data;
    const user = await registerPendingUser({ name, email, password });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ACCOUNT_EXISTS') {
        return NextResponse.json({ error: 'That email is already registered.' }, { status: 400 });
      }
      if (error.message === 'INVALID_INPUT' || error.message.includes('Password must be at least')) {
        return NextResponse.json({ error: error.message === 'INVALID_INPUT' ? 'Invalid registration payload.' : error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unable to create account request.' }, { status: 500 });
  }
}

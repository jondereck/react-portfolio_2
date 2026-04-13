import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthActor } from '@/lib/auth/session';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { getSelfAccount, updateSelfAccount } from '@/lib/auth/account-management';

const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  currentPassword: z.string().optional().default(''),
  newPassword: z.string().trim().max(200).optional().default(''),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    const account = await getSelfAccount(actor.user.id);
    return NextResponse.json({ account });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ error: 'Unable to load account.' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    const parsed = updateAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid account payload.' }, { status: 400 });
    }

    const account = await updateSelfAccount({
      userId: actor.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });

    return NextResponse.json({ account });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) return authError;

    if (error instanceof Error) {
      if (error.message === 'INVALID_INPUT') {
        return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
      }
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        return NextResponse.json(
          { error: 'Current password is required to change your email or password.' },
          { status: 400 },
        );
      }
      if (error.message === 'EMAIL_IN_USE') {
        return NextResponse.json({ error: 'That email is already in use.' }, { status: 400 });
      }
      if (error.message === 'USER_NOT_FOUND') {
        return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
      }
    }

    return NextResponse.json({ error: 'Unable to update account.' }, { status: 500 });
  }
}

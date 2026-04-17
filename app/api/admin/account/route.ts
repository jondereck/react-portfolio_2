import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthActor } from '@/lib/auth/session';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { getSelfAccount, updateSelfAccount } from '@/lib/auth/account-management';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';
import { createFieldErrorResponse, createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

const updateAccountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  currentPassword: z.string().optional().default(''),
  newPassword: z
    .string()
    .trim()
    .max(200)
    .refine((value) => !value || value.length >= MIN_PASSWORD_LENGTH, {
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    })
    .optional()
    .default(''),
});

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    const [account, settings] = await Promise.all([
      getSelfAccount(actor.user.id),
      getAdminSettings(),
    ]);
    return NextResponse.json({
      account,
      sessionPolicy: {
        sessionTtlHours: settings.security.sessionTtlHours,
      },
    });
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
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_ACCOUNT_PAYLOAD' });
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
        return createFormErrorResponse({ error: 'Name and email are required.', errorCode: 'INVALID_ACCOUNT_PAYLOAD' }, 400);
      }
      if (error.message === 'INVALID_CURRENT_PASSWORD') {
        return createFieldErrorResponse({
          field: 'currentPassword',
          message: 'Current password is required to change your email or password.',
          errorCode: 'INVALID_CURRENT_PASSWORD',
        });
      }
      if (error.message === 'EMAIL_IN_USE') {
        return createFieldErrorResponse({
          field: 'email',
          message: 'That email is already in use.',
          errorCode: 'EMAIL_IN_USE',
        });
      }
      if (error.message === 'USER_NOT_FOUND') {
        return createFormErrorResponse({ error: 'Account not found.', errorCode: 'USER_NOT_FOUND' }, 404);
      }
    }

    return createFormErrorResponse({ error: 'Unable to update account.', errorCode: 'ACCOUNT_UPDATE_FAILED' }, 500);
  }
}

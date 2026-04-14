import { NextResponse } from 'next/server';
import { z } from 'zod';
import { USER_MANAGEMENT_ROLES } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { requireRole } from '@/lib/auth/session';
import { createManagedUser, listManagedUsers, MANAGEABLE_ROLES } from '@/lib/auth/user-management';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';
import { createFieldErrorResponse, createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().trim().min(MIN_PASSWORD_LENGTH).max(200),
  role: z.enum(MANAGEABLE_ROLES as [string, ...string[]]),
  activateNow: z.boolean().optional(),
});

export async function GET(request: Request) {
  try {
    await requireRole(USER_MANAGEMENT_ROLES, request);
    const users = await listManagedUsers();
    return NextResponse.json({ users });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) return authError;
    return NextResponse.json({ error: 'Unable to load users.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(USER_MANAGEMENT_ROLES, request);
    const parsed = createUserSchema.safeParse(await request.json());
    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_USER_PAYLOAD' });
    }

    const user = await createManagedUser({
      actorUserId: actor.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      password: parsed.data.password,
      role: parsed.data.role,
      activateNow: parsed.data.activateNow,
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) return authError;

    if (error instanceof Error) {
      if (error.message === 'ACCOUNT_EXISTS') {
        return createFieldErrorResponse({
          field: 'email',
          message: 'That email is already in use.',
          errorCode: 'EMAIL_IN_USE',
        });
      }
      if (error.message === 'INVALID_ROLE' || error.message === 'INVALID_INPUT') {
        return createFormErrorResponse({ error: 'Please review the account details and try again.', errorCode: 'INVALID_USER_PAYLOAD' }, 400);
      }
    }

    return createFormErrorResponse({ error: 'Unable to create user.', errorCode: 'USER_CREATE_FAILED' }, 500);
  }
}

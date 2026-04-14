import { NextResponse } from 'next/server';
import { z } from 'zod';
import { USER_MANAGEMENT_ROLES } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { requireRole } from '@/lib/auth/session';
import {
  approveManagedUser,
  changeManagedUserRole,
  MANAGEABLE_ROLES,
  rejectManagedUser,
  resetManagedUserPassword,
  setManagedUserActive,
  transferSuperAdmin,
} from '@/lib/auth/user-management';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';
import { createFieldErrorResponse, createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve'),
    role: z.enum(MANAGEABLE_ROLES as [string, ...string[]]).optional(),
  }),
  z.object({
    action: z.literal('reject'),
  }),
  z.object({
    action: z.literal('activate'),
  }),
  z.object({
    action: z.literal('suspend'),
  }),
  z.object({
    action: z.literal('change_role'),
    role: z.enum(MANAGEABLE_ROLES as [string, ...string[]]),
  }),
  z.object({
    action: z.literal('reset_password'),
    password: z.string().trim().min(MIN_PASSWORD_LENGTH).max(200),
  }),
  z.object({
    action: z.literal('transfer_super_admin'),
  }),
]);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await requireRole(USER_MANAGEMENT_ROLES, request);
    const { id } = await context.params;
    const parsed = actionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_USER_ACTION_PAYLOAD' });
    }

    switch (parsed.data.action) {
      case 'approve': {
        const user = await approveManagedUser({
          actorUserId: actor.user.id,
          userId: id,
          role: parsed.data.role,
        });
        return NextResponse.json({ user });
      }
      case 'reject': {
        await rejectManagedUser({
          actorUserId: actor.user.id,
          userId: id,
        });
        return NextResponse.json({ ok: true });
      }
      case 'activate': {
        const user = await setManagedUserActive({
          actorUserId: actor.user.id,
          userId: id,
          isActive: true,
        });
        return NextResponse.json({ user });
      }
      case 'suspend': {
        const user = await setManagedUserActive({
          actorUserId: actor.user.id,
          userId: id,
          isActive: false,
        });
        return NextResponse.json({ user });
      }
      case 'change_role': {
        const user = await changeManagedUserRole({
          actorUserId: actor.user.id,
          userId: id,
          role: parsed.data.role,
        });
        return NextResponse.json({ user });
      }
      case 'reset_password': {
        const user = await resetManagedUserPassword({
          actorUserId: actor.user.id,
          userId: id,
          password: parsed.data.password,
        });
        return NextResponse.json({ user });
      }
      case 'transfer_super_admin': {
        const user = await transferSuperAdmin({
          actorUserId: actor.user.id,
          targetUserId: id,
        });
        return NextResponse.json({ user, transferred: true });
      }
      default:
        return createFormErrorResponse({ error: 'Unsupported action.', errorCode: 'UNSUPPORTED_ACTION' }, 400);
    }
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) return authError;

    if (error instanceof Error) {
      if (
        [
          'INVALID_ROLE',
          'USER_NOT_FOUND',
          'NOT_PENDING',
          'NOT_APPROVED',
          'TARGET_NOT_ACTIVE',
          'ALREADY_SUPER_ADMIN',
          'SUPER_ADMIN_LOCKED',
        ].includes(error.message)
      ) {
        const messageMap: Record<string, string> = {
          INVALID_ROLE: 'Invalid role selection.',
          USER_NOT_FOUND: 'User not found.',
          NOT_PENDING: 'Only pending users can be rejected.',
          NOT_APPROVED: 'Pending users must be approved first.',
          TARGET_NOT_ACTIVE: 'Target account must be active before transfer.',
          ALREADY_SUPER_ADMIN: 'That account already holds super admin.',
          SUPER_ADMIN_LOCKED: 'Use the transfer action to change the super admin account.',
        };
        if (error.message === 'INVALID_ROLE') {
          return createFieldErrorResponse({ field: 'role', message: messageMap[error.message], errorCode: 'INVALID_ROLE' });
        }

        return createFormErrorResponse({ error: messageMap[error.message], errorCode: error.message }, error.message === 'USER_NOT_FOUND' ? 404 : 400);
      }
    }

    return createFormErrorResponse({ error: 'Unable to update user.', errorCode: 'USER_UPDATE_FAILED' }, 500);
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { USER_MANAGEMENT_ROLES } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { requireRole } from '@/lib/auth/session';
import { inviteManagedUser, INVITABLE_ROLES, listManagedUsers } from '@/lib/auth/user-management';

const createUserSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  role: z.enum(INVITABLE_ROLES as [string, ...string[]]),
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
      return NextResponse.json({ error: 'Invalid user payload.' }, { status: 400 });
    }

    const invited = await inviteManagedUser({
      actorUserId: actor.user.id,
      name: parsed.data.name,
      email: parsed.data.email,
      role: parsed.data.role,
      appOrigin: new URL(request.url).origin,
    });

    return NextResponse.json({ invited }, { status: 201 });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) return authError;

    if (error instanceof Error) {
      if (error.message === 'EMAIL_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'Email delivery is not configured.' }, { status: 500 });
      }
      if (error.message === 'ACCOUNT_ALREADY_ACTIVE') {
        return NextResponse.json({ error: 'That email already belongs to an active account.' }, { status: 400 });
      }
      if (error.message === 'SUPER_ADMIN_LOCKED') {
        return NextResponse.json({ error: 'Super admin accounts cannot be created through this screen.' }, { status: 400 });
      }
      if (error.message.includes('You can only send testing emails to your own email address')) {
        return NextResponse.json(
          {
            error:
              'Resend is still using the test sender. Verify your own domain in Resend and change the sender email in admin settings before inviting other users.',
          },
          { status: 400 },
        );
      }
      if (error.message === 'INVALID_ROLE' || error.message === 'INVALID_INPUT') {
        return NextResponse.json({ error: 'Invalid user payload.' }, { status: 400 });
      }
    }

    return NextResponse.json({ error: 'Unable to invite user.' }, { status: 500 });
  }
}

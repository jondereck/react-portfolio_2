import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerPendingUser } from '@/lib/auth/user-management';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().trim().min(MIN_PASSWORD_LENGTH).max(200),
});

function getRegistrationValidationMessage(error: z.ZodError) {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return 'Invalid registration details.';
  }

  const field = firstIssue.path[0];
  if (field === 'name') {
    return 'Full name must be at least 2 characters.';
  }
  if (field === 'email') {
    return 'Enter a valid email address.';
  }
  if (field === 'password') {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }

  return 'Invalid registration details.';
}

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: getRegistrationValidationMessage(parsed.error) }, { status: 400 });
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
        return NextResponse.json(
          {
            error: error.message === 'INVALID_INPUT' ? 'Full name, email, and password are required.' : error.message,
          },
          { status: 400 },
        );
      }
    }

    return NextResponse.json({ error: 'Unable to create account request.' }, { status: 500 });
  }
}

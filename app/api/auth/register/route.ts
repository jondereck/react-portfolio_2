import { NextResponse } from 'next/server';
import { z } from 'zod';
import { registerPendingUser } from '@/lib/auth/user-management';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';
import { createFieldErrorResponse, createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().trim().min(MIN_PASSWORD_LENGTH).max(200),
});

export async function POST(request: Request) {
  try {
    const parsed = registrationSchema.safeParse(await request.json());
    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_REGISTRATION_PAYLOAD' });
    }

    const { name, email, password } = parsed.data;
    const user = await registerPendingUser({ name, email, password });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ACCOUNT_EXISTS') {
        return createFieldErrorResponse({
          field: 'email',
          message: 'That email is already registered.',
          errorCode: 'EMAIL_IN_USE',
        });
      }
      if (error.message === 'INVALID_INPUT' || error.message.includes('Password must be at least')) {
        if (error.message.includes('Password must be at least')) {
          return createFieldErrorResponse({
            field: 'password',
            message: error.message,
            errorCode: 'INVALID_PASSWORD',
          });
        }

        return createFormErrorResponse(
          {
            error: 'Full name, email, and password are required.',
            errorCode: 'INVALID_REGISTRATION_PAYLOAD',
          },
          400,
        );
      }
    }

    return createFormErrorResponse({ error: 'Unable to create account request.', errorCode: 'REGISTRATION_FAILED' }, 500);
  }
}

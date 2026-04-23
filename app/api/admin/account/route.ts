import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuthActor } from '@/lib/auth/session';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { getSelfAccount, updateSelfAccount, updateSelfAccountNeon } from '@/lib/auth/account-management';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { MIN_PASSWORD_LENGTH } from '@/lib/password/policy';
import { createFieldErrorResponse, createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';
import { getNeonAuth } from '@/lib/auth/neon-server';

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
      actorSource: actor.source,
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
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return createFormErrorResponse({ error: 'Invalid payload.', errorCode: 'INVALID_ACCOUNT_PAYLOAD' }, 400);
    }

    const parsed = updateAccountSchema.safeParse(
      actor.source === 'neon'
        ? {
            ...body,
            // For Neon-authenticated users, email is managed by Neon Auth.
            // Keep local email aligned with the Neon session email.
            email: actor.user.email,
          }
        : body,
    );
    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_ACCOUNT_PAYLOAD' });
    }

    const wantsPasswordChange = Boolean(parsed.data.newPassword);

    if (actor.source === 'neon') {
      let setCookiesFromNeon: string[] = [];

      if (wantsPasswordChange) {
        if (!parsed.data.currentPassword) {
          return createFieldErrorResponse({
            field: 'currentPassword',
            message: 'Current password is required to change your password.',
            errorCode: 'INVALID_CURRENT_PASSWORD',
          });
        }

        const neon = getNeonAuth();
        if (!neon) {
          return createFormErrorResponse({ error: 'Neon Auth is not configured.', errorCode: 'NEON_NOT_CONFIGURED' }, 503);
        }

        // Use Neon handler proxy so Origin fallback is applied and Set-Cookie headers are preserved.
        const handler = neon.handler();
        const origin = new URL(request.url).origin;
        const proxyHeaders = new Headers(request.headers);
        proxyHeaders.set('content-type', 'application/json');
        proxyHeaders.set('origin', origin);

        const proxyRequest = new Request(new URL('/api/neon-auth/change-password', request.url), {
          method: 'POST',
          headers: proxyHeaders,
          body: JSON.stringify({
            currentPassword: parsed.data.currentPassword,
            newPassword: parsed.data.newPassword,
            revokeOtherSessions: false,
          }),
        });

        const proxyResponse = await handler.POST(proxyRequest, {
          params: Promise.resolve({ path: ['change-password'] }),
        });

        const proxyPayload = await proxyResponse.json().catch(() => ({}));

        if (!proxyResponse.ok) {
          const message =
            typeof proxyPayload?.message === 'string'
              ? proxyPayload.message
              : typeof proxyPayload?.error === 'string'
                ? proxyPayload.error
                : proxyResponse.statusText || 'Unable to update password.';

          if (proxyResponse.status === 401 || /invalid.*password|invalid credentials|current password/i.test(message)) {
            return createFieldErrorResponse({
              field: 'currentPassword',
              message: 'Current password is incorrect.',
              errorCode: 'INVALID_CURRENT_PASSWORD',
              status: 400,
            });
          }

          return createFormErrorResponse(
            { error: message || 'Unable to update password.', errorCode: 'NEON_PASSWORD_CHANGE_FAILED', details: proxyPayload },
            proxyResponse.status || 400,
          );
        }

        setCookiesFromNeon = proxyResponse.headers.getSetCookie();
      }

      const account = await updateSelfAccountNeon({
        userId: actor.user.id,
        name: parsed.data.name,
        email: actor.user.email,
        passwordChanged: wantsPasswordChange,
      });

      const response = NextResponse.json({ account });
      for (const setCookie of setCookiesFromNeon) {
        response.headers.append('set-cookie', setCookie);
      }

      return response;
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

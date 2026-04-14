import { NextResponse } from 'next/server';
import { canManageGlobalSettings } from '@/lib/auth/roles';
import { resolveRequestActor } from '@/lib/auth/session';
import { bumpSessionVersion, getAdminSettingsDashboardData, logAdminAuditEvent, updateAdminSettings } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { integrationsSettingsSchema, securitySettingsSchema } from '@/lib/validators';
import { createFormErrorResponse, createZodFormErrorResponse, mergeFieldErrors } from '@/lib/server/form-responses';
import { formatZodFieldErrors } from '@/lib/server/request-parsing';

type SettingsPayload = {
  integrations?: unknown;
  security?: unknown;
  forceSignOutAllSessions?: unknown;
};

export async function GET(request: Request) {
  const actor = await resolveRequestActor(request);
  if (!actor) {
    return createFormErrorResponse({ error: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }, 401);
  }
  if (!canManageGlobalSettings(actor.user.role)) {
    return createFormErrorResponse({ error: 'Forbidden', errorCode: 'FORBIDDEN' }, 403);
  }

  const data = await getAdminSettingsDashboardData();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return createFormErrorResponse({ error: 'Too many requests. Try again later.', errorCode: 'RATE_LIMITED' }, 429);
  }

  const actor = await resolveRequestActor(request);
  if (!actor) {
    return createFormErrorResponse({ error: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }, 401);
  }
  if (!canManageGlobalSettings(actor.user.role)) {
    return createFormErrorResponse({ error: 'Forbidden', errorCode: 'FORBIDDEN' }, 403);
  }

  try {
    const body = (await request.json()) as SettingsPayload;
    const nextIntegrations = body.integrations
      ? integrationsSettingsSchema.partial().safeParse(body.integrations)
      : null;
    const nextSecurity = body.security ? securitySettingsSchema.partial().safeParse(body.security) : null;
    const forceSignOut = body.forceSignOutAllSessions === true;

    if ((nextIntegrations && !nextIntegrations.success) || (nextSecurity && !nextSecurity.success)) {
      const fieldErrors = mergeFieldErrors(
        nextIntegrations?.success ? undefined : formatZodFieldErrors(nextIntegrations.error, 'integrations'),
        nextSecurity?.success ? undefined : formatZodFieldErrors(nextSecurity.error, 'security'),
      );

      return createFormErrorResponse(
        {
          error: Object.values(fieldErrors)[0]?.[0] || 'Validation failed.',
          errorCode: 'INVALID_SETTINGS_PAYLOAD',
          fieldErrors,
        },
        400,
      );
    }

    if (!nextIntegrations && !nextSecurity && !forceSignOut) {
      return createFormErrorResponse(
        {
          error: 'Choose at least one settings section to update.',
          errorCode: 'EMPTY_SETTINGS_UPDATE',
        },
        400,
      );
    }

    if (nextIntegrations?.data || nextSecurity?.data) {
      await updateAdminSettings({
        integrations: nextIntegrations?.data,
        security: nextSecurity?.data,
      });

      await logAdminAuditEvent({
        actorUserId: actor.user.id,
        type: 'settings_updated',
        details: {
          scope: [
            nextIntegrations?.data ? 'integrations' : null,
            nextSecurity?.data ? 'security' : null,
          ].filter(Boolean),
        },
      });
    }

    if (forceSignOut) {
      await bumpSessionVersion({ scope: 'security' });
    }

    const data = await getAdminSettingsDashboardData();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to update admin settings', error);
    if (error instanceof SyntaxError) {
      return createFormErrorResponse({ error: 'Malformed JSON request body.', errorCode: 'MALFORMED_JSON' }, 400);
    }

    if (error instanceof Error && 'issues' in error) {
      return createZodFormErrorResponse(error as never, { errorCode: 'INVALID_SETTINGS_PAYLOAD' });
    }

    return createFormErrorResponse({ error: 'Unable to update admin settings.', errorCode: 'SETTINGS_UPDATE_FAILED' }, 500);
  }
}

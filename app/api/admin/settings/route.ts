import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { bumpSessionVersion, getAdminSettingsDashboardData, logAdminAuditEvent, updateAdminSettings } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { integrationsSettingsSchema, securitySettingsSchema } from '@/lib/validators';

type SettingsPayload = {
  integrations?: unknown;
  security?: unknown;
  forceSignOutAllSessions?: unknown;
};

export async function GET(request: Request) {
  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await getAdminSettingsDashboardData();
  return NextResponse.json(data);
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as SettingsPayload;
    const nextIntegrations = body.integrations
      ? integrationsSettingsSchema.partial().safeParse(body.integrations)
      : null;
    const nextSecurity = body.security ? securitySettingsSchema.partial().safeParse(body.security) : null;
    const forceSignOut = body.forceSignOutAllSessions === true;

    if ((nextIntegrations && !nextIntegrations.success) || (nextSecurity && !nextSecurity.success)) {
      return NextResponse.json({ error: 'Invalid settings payload.' }, { status: 400 });
    }

    if (!nextIntegrations && !nextSecurity && !forceSignOut) {
      return NextResponse.json({ error: 'No settings update provided.' }, { status: 400 });
    }

    if (nextIntegrations?.data || nextSecurity?.data) {
      await updateAdminSettings({
        integrations: nextIntegrations?.data,
        security: nextSecurity?.data,
      });

      await logAdminAuditEvent({
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
    return NextResponse.json({ error: 'Unable to update admin settings.' }, { status: 500 });
  }
}

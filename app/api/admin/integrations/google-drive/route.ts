import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import {
  disconnectGoogleDriveAccountForUser,
  getGoogleDriveConnectionStatusForUser,
  GOOGLE_DRIVE_LINK_COOKIE,
  isGoogleDriveOAuthConfigured,
} from '@/lib/auth/google-drive';
import { requireAuthActor } from '@/lib/auth/session';
import { getAdminSettings } from '@/lib/server/admin-settings';

function createForbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return createForbiddenResponse();
    }

    const settings = await getAdminSettings();
    const connection = await getGoogleDriveConnectionStatusForUser(actor.user.id);

    return NextResponse.json({
      featureEnabled: settings.integrations.googleDriveImportEnabled,
      oauthConfigured: isGoogleDriveOAuthConfigured(),
      connected: connection.connected,
      expiresAt: connection.expiresAt,
      hasRefreshToken: connection.hasRefreshToken,
      scope: connection.scope,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unable to load Google Drive connection status.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return createForbiddenResponse();
    }

    const settings = await getAdminSettings();
    if (!settings.integrations.googleDriveImportEnabled) {
      return NextResponse.json({ error: 'Google Drive imports are disabled.' }, { status: 403 });
    }

    if (!isGoogleDriveOAuthConfigured()) {
      return NextResponse.json({ error: 'Google Drive OAuth is not configured.' }, { status: 503 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: GOOGLE_DRIVE_LINK_COOKIE,
      value: actor.user.id,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 10,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unable to start Google Drive connection.' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return createForbiddenResponse();
    }

    await disconnectGoogleDriveAccountForUser(actor.user.id);

    const response = NextResponse.json({ ok: true });
    response.cookies.set({
      name: GOOGLE_DRIVE_LINK_COOKIE,
      value: '',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 0,
      path: '/',
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Unable to disconnect Google Drive.' }, { status: 500 });
  }
}

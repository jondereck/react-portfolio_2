import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { getGoogleDriveAccessTokenForUser, isGoogleDriveOAuthConfigured } from '@/lib/auth/google-drive';
import { requireAuthActor } from '@/lib/auth/session';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { GoogleDriveAdapter } from '@/src/modules/gallery/adapters/googleDriveAdapter';

const driveAdapter = new GoogleDriveAdapter();

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
    if (!settings.integrations.googleDriveImportEnabled) {
      return NextResponse.json({ error: 'Google Drive imports are disabled.' }, { status: 403 });
    }

    if (!isGoogleDriveOAuthConfigured()) {
      return NextResponse.json({ error: 'Google Drive OAuth is not configured.' }, { status: 503 });
    }

    const url = new URL(request.url);
    const parentId = url.searchParams.get('parentId')?.trim() || null;
    const accessToken = await getGoogleDriveAccessTokenForUser(actor.user.id);
    const payload = await driveAdapter.getFolderContext({
      accessToken,
      parentId,
    });

    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'UNAUTHENTICATED') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message === 'GOOGLE_DRIVE_NOT_CONNECTED') {
        return NextResponse.json({ error: 'Connect Google Drive before browsing folders.' }, { status: 403 });
      }
      if (error.message === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        return NextResponse.json({ error: 'Google Drive access expired. Reconnect and try again.' }, { status: 403 });
      }
      if (error.message === 'GOOGLE_DRIVE_TOKEN_REFRESH_FAILED') {
        return NextResponse.json({ error: 'Unable to refresh Google Drive access. Reconnect and try again.' }, { status: 502 });
      }
      if (error.message === 'Google Drive folder not found, or the connected Google account does not have access to it.') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.startsWith('Google Drive error:')) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
      if (error.message === 'The connected Google account does not have permission to read that Google Drive folder.') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message === 'Google Drive API is not enabled for this Google Cloud project. Enable the Drive API and try again in a few minutes.') {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
    }

    return NextResponse.json({ error: 'Unable to browse Google Drive folders.' }, { status: 500 });
  }
}

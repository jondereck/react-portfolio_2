import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { getGoogleDriveAccessTokenForUser } from '@/lib/auth/google-drive';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { driveImportSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function POST(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const settings = await getAdminSettings();
    if (!settings.integrations.googleDriveImportEnabled) {
      return NextResponse.json({ error: 'Google Drive imports are disabled.' }, { status: 403 });
    }

    const { id: idParam } = await context.params;
    const albumId = parseId(idParam);
    if (!albumId) {
      return NextResponse.json({ error: 'Invalid album id' }, { status: 400 });
    }

    const album = await galleryService.getAlbumById(albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const parsed = driveImportSchema.parse(body);
    const accessToken = await getGoogleDriveAccessTokenForUser(actor.user.id);
    const shouldStream = new URL(request.url).searchParams.get('stream') === '1';
    if (!shouldStream) {
      const result = await galleryService.importGoogleDriveFolder(albumId, {
        folderId: String(parsed.folderId),
        selectedFileIds: parsed.selectedFileIds,
        accessToken,
      });

      return NextResponse.json(
        {
          importedCount: result.created.length,
          skippedCount: result.skipped.length,
          photos: result.created,
          skipped: result.skipped,
        },
        { status: 201 },
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: string, payload: Record<string, unknown>) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          send('start', { ok: true });
          const result = await galleryService.importGoogleDriveFolder(albumId, {
            folderId: String(parsed.folderId),
            selectedFileIds: parsed.selectedFileIds,
            accessToken,
            onProgress: (progress) => {
              send('progress', progress);
            },
          });

          send('complete', {
            importedCount: result.created.length,
            skippedCount: result.skipped.length,
            photos: result.created,
            skipped: result.skipped,
          });
          controller.close();
        } catch (streamError) {
          send('error', {
            error: streamError instanceof Error ? streamError.message : 'Unable to import Google Drive folder.',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    if (error instanceof Error) {
      if (error.message === 'GOOGLE_DRIVE_NOT_CONNECTED') {
        return NextResponse.json({ error: 'Connect Google Drive before importing.' }, { status: 403 });
      }
      if (error.message === 'GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED') {
        return NextResponse.json({ error: 'Google Drive OAuth is not configured.' }, { status: 503 });
      }
      if (error.message === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        return NextResponse.json({ error: 'Google Drive access expired. Reconnect and try again.' }, { status: 403 });
      }
      if (error.message === 'GOOGLE_DRIVE_TOKEN_REFRESH_FAILED') {
        return NextResponse.json({ error: 'Unable to refresh Google Drive access. Reconnect and try again.' }, { status: 502 });
      }
      if (error.message === 'Google Drive API is not enabled for this Google Cloud project. Enable the Drive API and try again in a few minutes.') {
        return NextResponse.json({ error: error.message }, { status: 503 });
      }
      if (error.message === 'Google Drive folder not found, or the connected Google account does not have access to it.') {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message === 'The connected Google account does not have permission to read that Google Drive folder.') {
        return NextResponse.json({ error: error.message }, { status: 403 });
      }
      if (error.message.startsWith('Google Drive error:')) {
        return NextResponse.json({ error: error.message }, { status: 502 });
      }
    }
    return toErrorResponse(error, 'Unable to import Google Drive folder.');
  }
}

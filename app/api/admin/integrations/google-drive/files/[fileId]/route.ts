import { NextResponse } from 'next/server';
import { getGoogleDriveAccessTokenForUser } from '@/lib/auth/google-drive';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { resolveRequestActor } from '@/lib/auth/session';

type RouteContext = { params: Promise<{ fileId: string }> };

function buildErrorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveRequestActor(request);
    if (!actor) {
      throw new Error('UNAUTHENTICATED');
    }
    if (!canMutateContent(actor.user.role)) {
      throw new Error('FORBIDDEN');
    }

    const { fileId } = await context.params;
    if (!fileId) {
      return buildErrorResponse(400, 'Missing Google Drive file id.');
    }

    const accessToken = await getGoogleDriveAccessTokenForUser(actor.user.id);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        return buildErrorResponse(404, 'Google Drive file not found.');
      }
      if (response.status === 403) {
        return buildErrorResponse(403, 'Google Drive file access denied.');
      }

      const message = await response.text().catch(() => '');
      return buildErrorResponse(502, message || 'Unable to load Google Drive file.');
    }

    const headers = new Headers();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'private, no-store, max-age=0');

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    const disposition = response.headers.get('content-disposition');
    if (disposition) {
      headers.set('Content-Disposition', disposition);
    }

    return new Response(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }

    if (error instanceof Error) {
      if (error.message === 'GOOGLE_DRIVE_NOT_CONNECTED') {
        return buildErrorResponse(403, 'Connect Google Drive before loading imported images.');
      }
      if (error.message === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        return buildErrorResponse(403, 'Google Drive access expired. Reconnect and try again.');
      }
      if (error.message === 'GOOGLE_DRIVE_TOKEN_REFRESH_FAILED') {
        return buildErrorResponse(502, 'Unable to refresh Google Drive access. Reconnect and try again.');
      }
      if (error.message === 'GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED') {
        return buildErrorResponse(503, 'Google Drive OAuth is not configured.');
      }
    }

    console.error(error);
    return buildErrorResponse(500, 'Unable to load Google Drive file.');
  }
}

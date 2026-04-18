import { NextResponse } from 'next/server';
import { PhotoSourceType } from '@prisma/client';
import { getGoogleDriveAccessTokenForUserOrAny } from '@/lib/auth/google-drive';
import { canAccessProfile, resolveRequestActor } from '@/lib/auth/session';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

function errorResponse(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { id: albumIdParam, photoId: photoIdParam } = await context.params;
    const albumId = parseId(albumIdParam);
    const photoId = parseId(photoIdParam);

    if (!albumId || !photoId) {
      return errorResponse(400, 'Invalid media id.');
    }

    const album = await prisma.album.findUnique({
      where: { id: albumId },
      select: {
        id: true,
        profileId: true,
        shareLinkEnabled: true,
      },
    });

    if (!album) {
      return errorResponse(404, 'Album not found.');
    }

    const shareToken = new URL(request.url).searchParams.get('share')?.trim() || '';
    const actor = await resolveRequestActor(request);
    const sharedAlbumMatch =
      shareToken && album.shareLinkEnabled
        ? await prisma.$queryRaw<Array<{ id: number }>>`
            SELECT "id"
            FROM "Album"
            WHERE "id" = ${albumId}
              AND "shareLinkEnabled" = true
              AND "shareToken" = ${shareToken}
            LIMIT 1
          `
        : [];
    const hasShareAccess = sharedAlbumMatch.length > 0;
    const hasActorAccess = Boolean(actor && canAccessProfile(actor, album.profileId));

    if (!hasShareAccess && !hasActorAccess) {
      throw new Error(actor ? 'FORBIDDEN' : 'UNAUTHENTICATED');
    }

    const photo = await prisma.albumPhoto.findFirst({
      where: {
        id: photoId,
        albumId,
      },
      select: {
        id: true,
        imageUrl: true,
        mimeType: true,
        sourceType: true,
        sourceId: true,
      },
    });

    if (!photo) {
      return errorResponse(404, 'Media not found.');
    }

    if (photo.sourceType !== PhotoSourceType.gdrive || !photo.sourceId) {
      return NextResponse.redirect(photo.imageUrl, { status: 302 });
    }

    const accessToken = await getGoogleDriveAccessTokenForUserOrAny(actor?.user.id ?? null);
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(photo.sourceId)}?alt=media&supportsAllDrives=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        cache: 'no-store',
      },
    );

    if (!response.ok) {
      if (response.status === 404) {
        return errorResponse(404, 'Google Drive file not found.');
      }
      if (response.status === 403) {
        return errorResponse(403, 'Google Drive file access denied.');
      }

      const message = await response.text().catch(() => '');
      return errorResponse(502, message || 'Unable to load Google Drive media.');
    }

    const headers = new Headers();
    headers.set('Content-Type', response.headers.get('content-type') || photo.mimeType || 'application/octet-stream');
    headers.set('Cache-Control', 'private, no-store, max-age=0');

    const contentLength = response.headers.get('content-length');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
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
        return errorResponse(503, 'No Google Drive connection is available for imported media.');
      }
      if (error.message === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        return errorResponse(503, 'Google Drive access expired. Reconnect and try again.');
      }
      if (error.message === 'GOOGLE_DRIVE_TOKEN_REFRESH_FAILED') {
        return errorResponse(502, 'Unable to refresh Google Drive access. Reconnect and try again.');
      }
      if (error.message === 'GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED') {
        return errorResponse(503, 'Google Drive OAuth is not configured.');
      }
    }

    console.error(error);
    return errorResponse(500, 'Unable to load Google Drive media.');
  }
}

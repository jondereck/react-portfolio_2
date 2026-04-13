import { NextResponse } from 'next/server';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { assertDownloadablePhoto, buildPhotoDownloadFilename, fetchPhotoDownload } from '@/lib/server/gallery-downloads';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-download', 80, 60_000)) {
    return NextResponse.json({ error: 'Too many download requests. Try again later.' }, { status: 429 });
  }

  try {
    const { profile } = await resolveManagedProfileFromRequest(request);
    const { id: idParam, photoId: photoIdParam } = await context.params;
    const albumId = parseId(idParam);
    const photoId = parseId(photoIdParam);
    if (!albumId || !photoId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const payload = await galleryService.getAlbumPhotoDownloadPayload(albumId, profile.id, photoId, true);
    if (!payload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    assertDownloadablePhoto(payload.photo);
    const { response } = await fetchPhotoDownload(payload.photo);
    const filename = buildPhotoDownloadFilename(payload.photo);
    const contentType = response.headers.get('content-type') || payload.photo.mimeType || 'application/octet-stream';

    const headers = new Headers({
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    });

    return new Response(response.body, { status: 200, headers });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to download media.');
  }
}

import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { buildAlbumZipFilename, createAlbumZipStream } from '@/lib/server/gallery-downloads';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

export const runtime = 'nodejs';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-download', 40, 60_000)) {
    return NextResponse.json({ error: 'Too many download requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const albumId = parseId(idParam);
    if (!albumId) {
      return NextResponse.json({ error: 'Invalid album id' }, { status: 400 });
    }

    const payload = await galleryService.getAlbumDownloadPayload(albumId, true);
    if (!payload) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const zip = await createAlbumZipStream(payload.downloadablePhotos);
    const filename = buildAlbumZipFilename(payload.album.slug);
    const headers = new Headers({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
      'X-Download-Included-Count': String(payload.downloadablePhotos.length),
      'X-Download-Skipped-Count': String(payload.skippedPhotos.length),
    });

    const stream = Readable.toWeb(zip.stream) as ReadableStream<Uint8Array>;
    return new Response(stream, { status: 200, headers });
  } catch (error) {
    return toErrorResponse(error, 'Unable to download album.');
  }
}

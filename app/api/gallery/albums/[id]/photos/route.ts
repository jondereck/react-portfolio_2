import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { gallerySortSchema, photoCreateSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: Request, context: RouteContext) {
  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const albumId = parseId(idParam);
    if (!albumId) {
      return NextResponse.json({ error: 'Invalid album id' }, { status: 400 });
    }

    const url = new URL(request.url);
    const sort = gallerySortSchema.parse(url.searchParams.get('sort') ?? 'custom');
    const result = await galleryService.listAlbumPhotos(albumId, sort, true);
    if (!result) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return toErrorResponse(error, 'Unable to load album photos.');
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
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

    const { data, imageFile } = await parseMultipartOrJson(request);
    const created = imageFile
      ? await galleryService.addUploadedAlbumPhoto(albumId, {
          file: imageFile,
          input: photoCreateSchema.omit({ imageUrl: true }).parse({
            ...data,
            sourceType: data.sourceType || 'upload',
          }),
        })
      : await galleryService.addAlbumPhoto(
          albumId,
          photoCreateSchema.parse({
            ...data,
            imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : '',
            cloudinaryPublicId: typeof data.cloudinaryPublicId === 'string' ? data.cloudinaryPublicId : undefined,
            sourceType: data.sourceType || 'upload',
          }),
        );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Unable to add photo.');
  }
}

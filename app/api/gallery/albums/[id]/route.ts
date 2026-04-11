import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { albumUpdateSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { slugify } from '@/src/modules/gallery/domain/slug';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: Request, context: RouteContext) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const album = await galleryService.getAlbumById(id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (error) {
    return toErrorResponse(error, 'Unable to load album.');
  }
}

export async function PUT(request: Request, context: RouteContext) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = albumUpdateSchema.parse({
      ...body,
      ...(body?.slug || body?.name ? { slug: slugify(String(body.slug || body.name)) } : {}),
    });

    const album = await galleryService.updateAlbum(id, parsed);
    return NextResponse.json(album);
  } catch (error) {
    return toErrorResponse(error, 'Unable to update album.');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id: idParam } = await context.params;
    const id = parseId(idParam);
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await galleryService.deleteAlbum(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, 'Unable to delete album.');
  }
}

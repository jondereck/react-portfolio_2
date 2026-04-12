import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { albumCreateSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { slugify } from '@/src/modules/gallery/domain/slug';

export async function GET(request: Request) {
  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const albums = await galleryService.listAlbums(true);
    return NextResponse.json(albums);
  } catch (error) {
    return toErrorResponse(error, 'Unable to load albums.');
  }
}

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = albumCreateSchema.parse({
      ...body,
      slug: slugify(String(body?.slug || body?.name || '')),
    });

    const album = await galleryService.createAlbum(parsed);
    return NextResponse.json(album, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Unable to create album.');
  }
}

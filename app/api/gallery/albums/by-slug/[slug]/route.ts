import { NextResponse } from 'next/server';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { toErrorResponse } from '@/lib/server/api-responses';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { slug } = await context.params;
    const album = await galleryService.getAlbumBySlug(slug, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (error) {
    return toErrorResponse(error, 'Unable to load album.');
  }
}

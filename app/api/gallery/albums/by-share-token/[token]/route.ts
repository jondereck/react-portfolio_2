import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/server/api-responses';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
    }

    const album = await galleryService.getAlbumByShareToken(token);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(album);
  } catch (error) {
    return toErrorResponse(error, 'Unable to load shared album.');
  }
}

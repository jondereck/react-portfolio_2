import { NextResponse } from 'next/server';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const resolved = await resolvePublicProfileFromRequest(request);
    if (!resolved?.profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const { slug } = await context.params;
    const album = await galleryService.getAlbumBySlug(slug, resolved.profile.id, resolved.canViewDrafts);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...album,
      accessMode: resolved.canViewDrafts ? 'owner' : 'public',
    });
  } catch (error) {
    return toErrorResponse(error, 'Unable to load album.');
  }
}

import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { movePhotosSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function POST(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: idParam } = await context.params;
    const sourceAlbumId = parseId(idParam);
    if (!sourceAlbumId) {
      return NextResponse.json({ error: 'Invalid album id' }, { status: 400 });
    }

    const parsed = movePhotosSchema.parse(body);
    const sourceAlbum = await galleryService.getAlbumById(sourceAlbumId, profile.id, true);
    if (!sourceAlbum) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const targetAlbum = await galleryService.getAlbumById(parsed.targetAlbumId, profile.id, true);
    if (!targetAlbum) {
      return NextResponse.json({ error: 'Target album not found' }, { status: 404 });
    }

    const result = await galleryService.moveAlbumPhotos(sourceAlbumId, parsed.targetAlbumId, parsed.photoIds);
    return NextResponse.json(result);
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to move photos.');
  }
}

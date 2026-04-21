import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canDeleteContent, canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

type RouteContext = { params: Promise<{ id: string; photoId: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const blurOverrideSchema = z.object({
  blurOverride: z.enum(['auto', 'force_blur', 'force_unblur']),
});

export async function PATCH(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const parsedBody = blurOverrideSchema.parse(body);
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: idParam, photoId: photoIdParam } = await context.params;
    const albumId = parseId(idParam);
    const photoId = parseId(photoIdParam);
    if (!albumId || !photoId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const album = await galleryService.getAlbumById(albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const updated = await galleryService.updateAlbumPhotoBlurOverride(albumId, photoId, parsedBody.blurOverride);
    if (!updated) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to update photo.');
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const { actor, profile } = await resolveManagedProfileFromRequest(request);
    if (!canDeleteContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { id: idParam, photoId: photoIdParam } = await context.params;
    const albumId = parseId(idParam);
    const photoId = parseId(photoIdParam);

    if (!albumId || !photoId) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const album = await galleryService.getAlbumById(albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await galleryService.removeAlbumPhoto(albumId, photoId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to remove photo.');
  }
}

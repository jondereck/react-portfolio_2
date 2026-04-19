import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getAdminSettings, logAdminAuditEvent } from '@/lib/server/admin-settings';
import { RequestValidationError } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { createUnclothyTask } from '@/lib/server/unclothy';
import { unclothyCreateTaskSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { isSafeHttpUrl } from '@/lib/url-safety';

function isExplicitAdultAge(value: unknown) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === 'automatic' || normalized === 'auto') {
    return false;
  }
  return normalized.includes('18') || normalized.includes('adult') || normalized.includes('mature');
}

async function fetchSourceImageBytes(imageUrl: string) {
  if (!isSafeHttpUrl(imageUrl)) {
    throw new RequestValidationError('Source image URL is invalid.', 400, undefined, 'INVALID_SOURCE_URL');
  }

  const response = await fetch(imageUrl, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new RequestValidationError('Unable to fetch source image.', 502, undefined, 'SOURCE_IMAGE_FETCH_FAILED', {
      upstreamStatus: response.status,
    });
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!contentType.startsWith('image/')) {
    throw new RequestValidationError('Selected media must be an image.', 400, undefined, 'UNSUPPORTED_MEDIA_TYPE', {
      contentType,
    });
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, contentType };
}

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = unclothyCreateTaskSchema.parse(body);
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getAdminSettings();
    if (!settings.integrations.unclothyEnabled) {
      return NextResponse.json({ error: 'Unclothy integration is disabled.' }, { status: 403 });
    }

    const album = await galleryService.getAlbumById(parsed.albumId, profile.id, true);
    if (!album) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const downloadPayload = await galleryService.getAlbumPhotoDownloadPayload(parsed.albumId, profile.id, parsed.sourcePhotoId, true);
    if (!downloadPayload?.photo) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const photo = downloadPayload.photo;
    if (photo.mimeType && !String(photo.mimeType).toLowerCase().startsWith('image/')) {
      throw new RequestValidationError('Selected media must be an image.', 400, undefined, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const nextSettings = {
      ...(parsed.settings ?? {}),
      gender: 'female',
    } as Record<string, unknown>;
    delete (nextSettings as any).penis;

    const requestedAge = (nextSettings as any).age;
    if (typeof requestedAge === 'string' && requestedAge.trim() && !isExplicitAdultAge(requestedAge)) {
      throw new RequestValidationError(
        'Age must be an explicit adult (18+) option. "automatic" is not allowed.',
        400,
        { settings: ['Age must be an explicit adult (18+) option.'] },
        'UNCLOTHY_AGE_NOT_ALLOWED',
      );
    }
    if (!requestedAge) {
      (nextSettings as any).age = '18';
    }

    const { buffer } = await fetchSourceImageBytes(photo.imageUrl);
    const base64 = buffer.toString('base64');

    const created = await createUnclothyTask({
      base64,
      settings: nextSettings,
    });

    const taskId = typeof created?.result?.task_id === 'string' ? created.result.task_id : null;
    if (!taskId) {
      throw new RequestValidationError('Unclothy did not return a task id.', 502, undefined, 'UNCLOTHY_INVALID_RESPONSE', {
        providerPayload: created,
      });
    }

    await logAdminAuditEvent({
      actorUserId: actor.user.id,
      targetProfileId: profile.id,
      type: 'unclothy_task_created',
      targetType: 'gallery_album',
      targetId: String(parsed.albumId),
      details: {
        taskId,
        albumId: parsed.albumId,
        sourcePhotoId: parsed.sourcePhotoId,
      },
    });

    return NextResponse.json({ taskId }, { status: 201 });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to create Unclothy task.');
  }
}

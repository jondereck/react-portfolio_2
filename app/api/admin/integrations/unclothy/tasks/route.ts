import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { requireAuthActor } from '@/lib/auth/session';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { RequestValidationError } from '@/lib/server/uploads';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import {
  createUnclothyEnvelope,
  createUnclothySuccessResponse,
  getUnclothyTaskSettings,
  toUnclothyErrorResponse,
} from '@/lib/server/unclothy';
import { enqueueUnclothyGenerationTask, listUnclothyQueueTasksForUser } from '@/lib/server/unclothy-queue';
import { unclothyCreateTaskSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { sanitizeUnclothyProviderSettings } from '@/lib/unclothy-settings';

async function loadProviderEnumAllowlist() {
  try {
    const settingsEnums = await getUnclothyTaskSettings();
    return settingsEnums && typeof settingsEnums === 'object' ? settingsEnums : {};
  } catch (error) {
    throw new RequestValidationError(
      'Unable to validate Unclothy settings right now. Try again later.',
      503,
      undefined,
      'UNCLOTHY_SETTINGS_ENUMS_UNAVAILABLE',
      {
        cause: error instanceof Error ? error.message : String(error),
      },
    );
  }
}

export async function GET(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 403,
          message: 'Forbidden',
        }),
        { status: 403 },
      );
    }

    const profileId = actor.profile?.id;
    const tasks = await listUnclothyQueueTasksForUser(actor.user.id, profileId);
    return createUnclothySuccessResponse({ tasks }, 200, 'Tasks loaded successfully.');
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to load Unclothy tasks.');
  }
}

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 60, 60_000)) {
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 429,
        message: 'Too many requests. Try again later.',
      }),
      { status: 429 },
    );
  }

  try {
    const body = await request.json();
    const parsed = unclothyCreateTaskSchema.parse(body);
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 403,
          message: 'Forbidden',
        }),
        { status: 403 },
      );
    }

    const settings = await getAdminSettings();
    if (!settings.integrations.unclothyEnabled) {
      return NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 403,
          message: 'Unclothy integration is disabled.',
        }),
        { status: 403 },
      );
    }

    const settingsEnums = await loadProviderEnumAllowlist();
    const album = await galleryService.getAlbumById(parsed.albumId, profile.id, true);
    if (!album) {
      return NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 404,
          message: 'Album not found.',
        }),
        { status: 404 },
      );
    }

    const downloadPayload = await galleryService.getAlbumPhotoDownloadPayload(parsed.albumId, profile.id, parsed.sourcePhotoId, true);
    if (!downloadPayload?.photo) {
      return NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 404,
          message: 'Source image not found.',
        }),
        { status: 404 },
      );
    }

    const photo = downloadPayload.photo;
    if (photo.mimeType && !String(photo.mimeType).toLowerCase().startsWith('image/')) {
      throw new RequestValidationError('Selected media must be an image.', 400, undefined, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const { settings: sanitizedSettings, fieldErrors } = sanitizeUnclothyProviderSettings(parsed.settings ?? {}, settingsEnums);
    const nextSettings = sanitizedSettings as unknown as Record<string, unknown>;

    if (Object.keys(fieldErrors).length > 0) {
      const firstKey = Object.keys(fieldErrors)[0];
      const firstMessage = fieldErrors[firstKey]?.[0] || 'Invalid settings.';
      throw new RequestValidationError(
        `Invalid Unclothy settings. ${firstMessage}`,
        400,
        fieldErrors as unknown as Record<string, string[]>,
        'UNCLOTHY_INVALID_SETTINGS_ENUM',
      );
    }

    const task = await enqueueUnclothyGenerationTask({
      userId: actor.user.id,
      profileId: profile.id,
      albumId: parsed.albumId,
      sourcePhotoId: parsed.sourcePhotoId,
      settingsSnapshot: nextSettings,
    });

    return createUnclothySuccessResponse({ task, task_id: task.id, status: 'queued' }, 201, 'Task queued successfully.');
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to queue Unclothy task.');
  }
}

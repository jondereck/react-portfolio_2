import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getAdminSettings, logAdminAuditEvent } from '@/lib/server/admin-settings';
import { RequestValidationError } from '@/lib/server/uploads';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import {
  createUnclothyEnvelope,
  createUnclothySuccessResponse,
  createUnclothyTask,
  getUnclothyTaskSettings,
  toUnclothyErrorResponse,
} from '@/lib/server/unclothy';
import { unclothyCreateTaskSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { isSafeHttpUrl } from '@/lib/url-safety';
import { getGoogleDriveAccessTokenForUserOrAny } from '@/lib/auth/google-drive';
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

async function fetchGoogleDriveImageBytes(sourceId: string, actorUserId: string) {
  let accessToken: string;
  try {
    accessToken = await getGoogleDriveAccessTokenForUserOrAny(actorUserId);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'GOOGLE_DRIVE_NOT_CONNECTED') {
        throw new RequestValidationError(
          'Connect Google Drive before generating from imported media.',
          503,
          undefined,
          'GOOGLE_DRIVE_NOT_CONNECTED',
        );
      }
      if (error.message === 'GOOGLE_DRIVE_RECONNECT_REQUIRED') {
        throw new RequestValidationError(
          'Google Drive access expired. Reconnect Google Drive and try again.',
          503,
          undefined,
          'GOOGLE_DRIVE_RECONNECT_REQUIRED',
        );
      }
      if (error.message === 'GOOGLE_DRIVE_TOKEN_REFRESH_FAILED') {
        throw new RequestValidationError(
          'Unable to refresh Google Drive access. Reconnect Google Drive and try again.',
          502,
          undefined,
          'GOOGLE_DRIVE_TOKEN_REFRESH_FAILED',
        );
      }
      if (error.message === 'GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED') {
        throw new RequestValidationError(
          'Google Drive OAuth is not configured.',
          503,
          undefined,
          'GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED',
        );
      }
    }

    throw error;
  }

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sourceId)}?alt=media&supportsAllDrives=true`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: 'no-store',
    },
  );

  if (!response.ok) {
    if (response.status === 404) {
      throw new RequestValidationError('Google Drive file not found.', 404, undefined, 'GOOGLE_DRIVE_FILE_NOT_FOUND');
    }
    if (response.status === 403) {
      throw new RequestValidationError('Google Drive file access denied.', 403, undefined, 'GOOGLE_DRIVE_FILE_FORBIDDEN');
    }

    const message = await response.text().catch(() => '');
    throw new RequestValidationError(message || 'Unable to load Google Drive media.', 502, undefined, 'GOOGLE_DRIVE_MEDIA_FETCH_FAILED', {
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

    const { buffer } =
      photo.sourceType === 'gdrive' && photo.sourceId
        ? await fetchGoogleDriveImageBytes(String(photo.sourceId), actor.user.id)
        : await fetchSourceImageBytes(photo.imageUrl);
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
        settingsSent: nextSettings,
      },
    });

    return createUnclothySuccessResponse({ task_id: taskId, settingsSent: nextSettings }, 201, 'Task created successfully.');
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to create Unclothy task.');
  }
}

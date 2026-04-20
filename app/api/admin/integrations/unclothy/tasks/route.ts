import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getAdminSettings, logAdminAuditEvent } from '@/lib/server/admin-settings';
import { RequestValidationError } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { createUnclothyTask, getUnclothyTaskSettings } from '@/lib/server/unclothy';
import { unclothyCreateTaskSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { isSafeHttpUrl } from '@/lib/url-safety';
import { getGoogleDriveAccessTokenForUserOrAny } from '@/lib/auth/google-drive';

function compareEnumKey(value: unknown) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function isAutomaticAgeOption(value: unknown) {
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'automatic' || normalized === 'auto';
}

function normalizeEnumOptions(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(String).map((option) => option.trim()).filter(Boolean);
  }

  if (value && typeof value === 'object') {
    const candidate = (value as Record<string, unknown>).options;
    if (Array.isArray(candidate)) {
      return candidate.map(String).map((option) => option.trim()).filter(Boolean);
    }
  }

  return null;
}

function resolveEnumValue(value: unknown, options: string[]) {
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return null;
  }

  const raw = String(value).trim();
  if (!raw) {
    return null;
  }

  const direct = options.find((option) => option === raw);
  if (direct) {
    return direct;
  }

  const lower = raw.toLowerCase();
  const caseInsensitive = options.find((option) => option.toLowerCase() === lower);
  if (caseInsensitive) {
    return caseInsensitive;
  }

  if (isAutomaticAgeOption(lower)) {
    return options.find((option) => isAutomaticAgeOption(option)) ?? null;
  }

  if (lower === '18') {
    return options.find((option) => option.toLowerCase().includes('18')) ?? null;
  }

  return null;
}

async function loadProviderEnumAllowlist() {
  try {
    const settingsEnums = await getUnclothyTaskSettings();
    const allowlist: Array<{ providerKey: string; options: string[] }> = [];
    const normalizedToProviderKey = new Map<string, string>();

    if (settingsEnums && typeof settingsEnums === 'object') {
      for (const [providerKey, providerValue] of Object.entries(settingsEnums as Record<string, unknown>)) {
        const options = normalizeEnumOptions(providerValue);
        if (!options || options.length === 0) {
          continue;
        }

        allowlist.push({ providerKey, options });
        const normalizedKey = compareEnumKey(providerKey);
        if (normalizedKey && !normalizedToProviderKey.has(normalizedKey)) {
          normalizedToProviderKey.set(normalizedKey, providerKey);
        }
      }
    }

    return { allowlist, normalizedToProviderKey };
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

    const { allowlist, normalizedToProviderKey } = await loadProviderEnumAllowlist();
    const providerEnums = new Map<string, string[]>();
    for (const entry of allowlist) {
      providerEnums.set(entry.providerKey, entry.options);
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

    const rawSettings = parsed.settings ?? {};
    const sanitizedSettings: Record<string, unknown> = {};
    const fieldErrors: Record<string, string[]> = {};
    const enumAliases = new Map<string, string>([
      ['breastssize', 'breastsize'],
      ['chestsize', 'breastsize'],
    ]);

    for (const [rawKey, rawValue] of Object.entries(rawSettings)) {
      const normalizedKey = compareEnumKey(rawKey);
      let providerKey = normalizedKey ? normalizedToProviderKey.get(normalizedKey) : null;
      if (!providerKey && normalizedKey) {
        const alias = enumAliases.get(normalizedKey);
        providerKey = alias ? normalizedToProviderKey.get(alias) ?? null : null;
      }

      if (!providerKey) {
        continue;
      }

      if (normalizedKey === 'penis' || compareEnumKey(providerKey) === 'penis') {
        continue;
      }

      const options = providerEnums.get(providerKey) ?? [];
      const resolved = resolveEnumValue(rawValue, options);
      if (!resolved) {
        const message = options.length > 0 ? `Must be one of: ${options.join(', ')}.` : 'Invalid value.';
        fieldErrors[`settings.${rawKey}`] = [message];
        continue;
      }

      sanitizedSettings[providerKey] = resolved;
    }

    if (Object.keys(fieldErrors).length > 0) {
      const firstKey = Object.keys(fieldErrors)[0];
      const firstMessage = fieldErrors[firstKey]?.[0] || 'Invalid settings.';
      throw new RequestValidationError(`Invalid Unclothy settings. ${firstMessage}`, 400, fieldErrors, 'UNCLOTHY_INVALID_SETTINGS_ENUM');
    }

    const nextSettings = {
      ...sanitizedSettings,
      gender: 'female',
    } as Record<string, unknown>;

    const ageProviderKey = normalizedToProviderKey.get(compareEnumKey('age')) || 'age';
    const requestedAge = (nextSettings as any)[ageProviderKey];
    const normalizedRequestedAge = typeof requestedAge === 'string' ? requestedAge.trim() : '';
    if (normalizedRequestedAge && !isAutomaticAgeOption(normalizedRequestedAge) && !isExplicitAdultAge(normalizedRequestedAge)) {
      throw new RequestValidationError(
        'Age must be "automatic" or an explicit adult (18+) option.',
        400,
        { settings: ['Age must be "automatic" or an explicit adult (18+) option.'] },
        'UNCLOTHY_AGE_INVALID',
      );
    }

    if (!normalizedRequestedAge) {
      const providerAgeKey = normalizedToProviderKey.get(compareEnumKey('age'));
      const ageOptions = providerAgeKey ? providerEnums.get(providerAgeKey) ?? [] : [];
      const automatic = ageOptions.find((option) => isAutomaticAgeOption(option));
      const adult = ageOptions.find((option) => isExplicitAdultAge(option)) || ageOptions.find((option) => option.toLowerCase().includes('18'));
      (nextSettings as any)[ageProviderKey] = automatic || adult || '18';
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

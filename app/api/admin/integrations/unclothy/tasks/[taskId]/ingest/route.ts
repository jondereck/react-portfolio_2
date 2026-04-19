import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { getAdminSettings, logAdminAuditEvent } from '@/lib/server/admin-settings';
import { RequestValidationError } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { getUnclothyTask } from '@/lib/server/unclothy';
import { unclothyIngestTaskSchema } from '@/src/modules/gallery/contracts';
import { galleryService } from '@/src/modules/gallery/services/galleryService';
import { isSafeHttpUrl } from '@/lib/url-safety';

type RouteContext = { params: Promise<{ taskId: string }> };

function formatCaptionTimestamp(date = new Date()) {
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

function stripDataUriPrefix(value: string) {
  const match = value.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    return { mimeType: null, base64: value };
  }
  return { mimeType: match[1] || null, base64: match[2] || '' };
}

function findFirstString(obj: unknown, candidates: string[]) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of candidates) {
    const value = (obj as any)[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractTaskOutput(taskPayload: any) {
  const result = taskPayload?.result;
  const base64 = findFirstString(result, ['base64', 'image_base64', 'output_base64', 'result_base64', 'image']);
  const url = findFirstString(result, ['url', 'image_url', 'imageUrl', 'result_url', 'output_url']);

  if (url && isSafeHttpUrl(url)) {
    return { kind: 'url' as const, value: url };
  }

  if (base64) {
    return { kind: 'base64' as const, value: base64 };
  }

  return null;
}

async function fetchOutputBytesFromUrl(url: string) {
  if (!isSafeHttpUrl(url)) {
    throw new RequestValidationError('Unclothy output URL is invalid.', 502, undefined, 'UNCLOTHY_OUTPUT_INVALID_URL');
  }

  const response = await fetch(url, { method: 'GET', cache: 'no-store' });
  if (!response.ok) {
    throw new RequestValidationError('Unable to download Unclothy output.', 502, undefined, 'UNCLOTHY_OUTPUT_DOWNLOAD_FAILED', {
      upstreamStatus: response.status,
    });
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { buffer, contentType: contentType || null };
}

function mimeToExtension(mimeType: string | null) {
  switch ((mimeType || '').toLowerCase()) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'image/png':
    default:
      return 'png';
  }
}

export async function POST(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 60, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = unclothyIngestTaskSchema.parse(body);
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

    const { taskId } = await context.params;
    const taskPayload = await getUnclothyTask(taskId);
    const output = extractTaskOutput(taskPayload as any);
    if (!output) {
      throw new RequestValidationError('Unclothy task is not completed yet (or no output was found).', 409, undefined, 'UNCLOTHY_NOT_READY', {
        providerPayload: taskPayload,
      });
    }

    let outputBytes: Buffer;
    let outputMimeType: string | null = null;

    if (output.kind === 'url') {
      const downloaded = await fetchOutputBytesFromUrl(output.value);
      outputBytes = downloaded.buffer;
      outputMimeType = downloaded.contentType;
    } else {
      const stripped = stripDataUriPrefix(output.value);
      outputMimeType = stripped.mimeType;
      if (!stripped.base64) {
        throw new RequestValidationError('Unclothy output payload is empty.', 502, undefined, 'UNCLOTHY_OUTPUT_EMPTY');
      }
      try {
        outputBytes = Buffer.from(stripped.base64, 'base64');
      } catch {
        throw new RequestValidationError('Unclothy output base64 could not be decoded.', 502, undefined, 'UNCLOTHY_OUTPUT_INVALID_BASE64');
      }
    }

    const mimeType = outputMimeType || 'image/png';
    if (!mimeType.startsWith('image/')) {
      throw new RequestValidationError('Unclothy output is not an image.', 502, undefined, 'UNCLOTHY_OUTPUT_UNSUPPORTED', { mimeType });
    }

    const extension = mimeToExtension(mimeType);
    const sourceLabel = downloadPayload.photo.caption || `media ${downloadPayload.photo.id}`;
    const filename = `unclothy-${taskId}.${extension}`;
    const caption = `Unclothy - ${sourceLabel} - ${formatCaptionTimestamp()}`;
    const file = new File([outputBytes], filename, { type: mimeType });

    const created = await galleryService.addUploadedAlbumPhoto(parsed.albumId, {
      file,
      input: {
        caption,
        sourceType: 'upload',
      },
    });

    await logAdminAuditEvent({
      actorUserId: actor.user.id,
      targetProfileId: profile.id,
      type: 'unclothy_task_ingested',
      targetType: 'gallery_album',
      targetId: String(parsed.albumId),
      details: {
        taskId,
        albumId: parsed.albumId,
        sourcePhotoId: parsed.sourcePhotoId,
        createdPhotoId: created.id,
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to ingest Unclothy result.');
  }
}


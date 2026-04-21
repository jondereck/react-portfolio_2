import { Prisma, UnclothyGenerationTaskPhase, UnclothyGenerationTaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getGoogleDriveAccessTokenForUserOrAny } from '@/lib/auth/google-drive';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';
import { createUnclothyTask, getUnclothyTask } from '@/lib/server/unclothy';
import { RequestValidationError } from '@/lib/server/uploads';
import { isSafeHttpUrl } from '@/lib/url-safety';
import { galleryService } from '@/src/modules/gallery/services/galleryService';

const MAX_RUNNING_TASKS_PER_USER = 3;
const WORKER_BATCH_SIZE = 24;
const WORKER_ADVISORY_LOCK_ID = BigInt(924_641_903);

type QueueTaskRecord = Prisma.UnclothyGenerationTaskGetPayload<Record<string, never>>;

function toJsonObject(value: unknown): Prisma.InputJsonObject {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Prisma.InputJsonObject;
  }
  return {};
}

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

function normalizeProviderStatus(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function isProviderFailedStatus(value: unknown) {
  const normalized = normalizeProviderStatus(value)?.toLowerCase();
  if (!normalized) return false;
  return normalized.includes('fail') || normalized.includes('error');
}

function inferCompletionFromPayload(payload: any) {
  const status = normalizeProviderStatus(payload?.result?.status);
  if (status) {
    const normalized = status.toLowerCase();
    if (['completed', 'complete', 'success', 'succeeded', 'done', 'finished'].includes(normalized)) {
      return true;
    }
    if (['failed', 'error'].includes(normalized)) {
      return true;
    }
  }

  const result = payload?.result;
  if (result && typeof result === 'object') {
    for (const key of ['base64', 'image_base64', 'output_base64', 'image', 'imageUrl', 'image_url', 'result_url', 'url']) {
      if (typeof (result as any)[key] === 'string') {
        return true;
      }
    }
  }

  return false;
}

function bumpPercent(current: number, min: number, max: number, step: number) {
  const base = Number.isFinite(current) ? current : min;
  return Math.max(min, Math.min(max, base + step));
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
  return { buffer: Buffer.from(arrayBuffer), contentType };
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
        throw new RequestValidationError('Google Drive OAuth is not configured.', 503, undefined, 'GOOGLE_DRIVE_OAUTH_NOT_CONFIGURED');
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
  return { buffer: Buffer.from(arrayBuffer), contentType };
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
  return { buffer: Buffer.from(arrayBuffer), contentType: contentType || null };
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

export function serializeUnclothyQueueTask(task: QueueTaskRecord) {
  return {
    id: task.id,
    queueTaskId: task.id,
    taskId: task.providerTaskId,
    providerTaskId: task.providerTaskId,
    status: task.status,
    phase: task.phase,
    percent: task.percent,
    statusText: task.statusText,
    providerStatus: task.providerStatus,
    errorMessage: task.errorMessage,
    albumId: task.albumId,
    sourcePhotoId: task.sourcePhotoId,
    settingsSnapshot: task.settingsSnapshot,
    settingsSent: task.settingsSent,
    startedAt: task.startedAt?.getTime() ?? null,
    completedAt: task.completedAt?.getTime() ?? null,
    failedAt: task.failedAt?.getTime() ?? null,
    createdAt: task.createdAt.getTime(),
    createdPhotoId: task.createdPhotoId,
  };
}

export async function listUnclothyQueueTasksForUser(userId: string, profileId?: number) {
  const activeTasks = await prisma.unclothyGenerationTask.findMany({
    where: {
      userId,
      ...(profileId ? { profileId } : {}),
      status: {
        in: [
          UnclothyGenerationTaskStatus.queued,
          UnclothyGenerationTaskStatus.running,
          UnclothyGenerationTaskStatus.failed,
        ],
      },
    },
    orderBy: [{ createdAt: 'asc' }],
    take: 100,
  });

  const completedTasks = await prisma.unclothyGenerationTask.findMany({
    where: {
      userId,
      ...(profileId ? { profileId } : {}),
      status: UnclothyGenerationTaskStatus.completed,
    },
    orderBy: [{ completedAt: 'desc' }],
    take: 20,
  });

  return [...activeTasks, ...completedTasks].map(serializeUnclothyQueueTask);
}

export async function getUnclothyQueueTaskForUser(taskId: string, userId: string) {
  const task = await prisma.unclothyGenerationTask.findFirst({
    where: {
      id: taskId,
      userId,
    },
  });
  return task ? serializeUnclothyQueueTask(task) : null;
}

export async function enqueueUnclothyGenerationTask(input: {
  userId: string;
  profileId: number;
  albumId: number;
  sourcePhotoId: number;
  settingsSnapshot: Record<string, unknown>;
}) {
  const task = await prisma.unclothyGenerationTask.create({
    data: {
      userId: input.userId,
      profileId: input.profileId,
      albumId: input.albumId,
      sourcePhotoId: input.sourcePhotoId,
      settingsSnapshot: toJsonObject(input.settingsSnapshot),
      statusText: 'Queued',
    },
  });

  await logAdminAuditEvent({
    actorUserId: input.userId,
    targetProfileId: input.profileId,
    type: 'unclothy_task_queued',
    targetType: 'gallery_album',
    targetId: String(input.albumId),
    details: {
      localTaskId: task.id,
      albumId: input.albumId,
      sourcePhotoId: input.sourcePhotoId,
      settingsSnapshot: input.settingsSnapshot,
    },
  });

  return serializeUnclothyQueueTask(task);
}

export async function cancelUnclothyQueueTask(taskId: string, userId: string) {
  const task = await prisma.unclothyGenerationTask.findFirst({
    where: {
      id: taskId,
      userId,
      status: {
        in: [UnclothyGenerationTaskStatus.queued, UnclothyGenerationTaskStatus.running, UnclothyGenerationTaskStatus.failed],
      },
    },
  });

  if (!task) return null;

  const updated = await prisma.unclothyGenerationTask.update({
    where: { id: task.id },
    data: {
      status: UnclothyGenerationTaskStatus.canceled,
      phase: UnclothyGenerationTaskPhase.canceled,
      percent: 0,
      statusText: 'Canceled',
      canceledAt: new Date(),
    },
  });

  return serializeUnclothyQueueTask(updated);
}

export async function retryUnclothyQueueTask(taskId: string, userId: string) {
  const task = await prisma.unclothyGenerationTask.findFirst({
    where: {
      id: taskId,
      userId,
      status: UnclothyGenerationTaskStatus.failed,
    },
  });

  if (!task) return null;

  const updated = await prisma.unclothyGenerationTask.update({
    where: { id: task.id },
    data: {
      status: UnclothyGenerationTaskStatus.queued,
      phase: UnclothyGenerationTaskPhase.queued,
      percent: 0,
      statusText: 'Queued',
      providerStatus: null,
      errorMessage: null,
      failedAt: null,
      providerTaskId: null,
      settingsSent: null,
      ingestRetries: 0,
      startedAt: null,
      completedAt: null,
      createdPhotoId: null,
    },
  });

  return serializeUnclothyQueueTask(updated);
}

async function failTask(task: QueueTaskRecord, error: unknown) {
  const message = error instanceof Error && error.message ? error.message : 'Unclothy task failed.';
  return prisma.unclothyGenerationTask.update({
    where: { id: task.id },
    data: {
      status: UnclothyGenerationTaskStatus.failed,
      phase: UnclothyGenerationTaskPhase.error,
      statusText: message,
      errorMessage: message,
      failedAt: new Date(),
    },
  });
}

async function createProviderTask(task: QueueTaskRecord) {
  const downloadPayload = await galleryService.getAlbumPhotoDownloadPayload(task.albumId, task.profileId, task.sourcePhotoId, true);
  if (!downloadPayload?.photo) {
    throw new RequestValidationError('Source image not found.', 404, undefined, 'SOURCE_IMAGE_NOT_FOUND');
  }

  const photo = downloadPayload.photo;
  if (photo.mimeType && !String(photo.mimeType).toLowerCase().startsWith('image/')) {
    throw new RequestValidationError('Selected media must be an image.', 400, undefined, 'UNSUPPORTED_MEDIA_TYPE');
  }

  const { buffer } =
    photo.sourceType === 'gdrive' && photo.sourceId
      ? await fetchGoogleDriveImageBytes(String(photo.sourceId), task.userId)
      : await fetchSourceImageBytes(photo.imageUrl);

  const created = await createUnclothyTask({
    base64: buffer.toString('base64'),
    settings: toJsonObject(task.settingsSnapshot),
  });

  const providerTaskId = typeof created?.result?.task_id === 'string' ? created.result.task_id : null;
  if (!providerTaskId) {
    throw new RequestValidationError('Unclothy did not return a task id.', 502, undefined, 'UNCLOTHY_INVALID_RESPONSE', {
      providerPayload: created,
    });
  }

  await logAdminAuditEvent({
    actorUserId: task.userId,
    targetProfileId: task.profileId,
    type: 'unclothy_task_created',
    targetType: 'gallery_album',
    targetId: String(task.albumId),
    details: {
      localTaskId: task.id,
      taskId: providerTaskId,
      albumId: task.albumId,
      sourcePhotoId: task.sourcePhotoId,
      settingsSent: task.settingsSnapshot,
    },
  });

  return prisma.unclothyGenerationTask.update({
    where: { id: task.id },
    data: {
      providerTaskId,
      settingsSent: toJsonObject(task.settingsSnapshot),
      phase: UnclothyGenerationTaskPhase.processing,
      percent: 15,
      statusText: 'Processing...',
      providerStatus: null,
    },
  });
}

async function ingestProviderOutput(task: QueueTaskRecord, taskPayload?: unknown) {
  if (!task.providerTaskId) {
    throw new RequestValidationError('Provider task id is missing.', 409, undefined, 'UNCLOTHY_TASK_ID_MISSING');
  }

  const outputPayload = taskPayload ?? (await getUnclothyTask(task.providerTaskId));
  const output = extractTaskOutput(outputPayload as any);
  if (!output) {
    throw new RequestValidationError('Unclothy task is not completed yet (or no output was found).', 409, undefined, 'UNCLOTHY_NOT_READY', {
      providerPayload: outputPayload as Record<string, unknown>,
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
    outputBytes = Buffer.from(stripped.base64, 'base64');
  }

  const mimeType = outputMimeType || 'image/png';
  if (!mimeType.startsWith('image/')) {
    throw new RequestValidationError('Unclothy output is not an image.', 502, undefined, 'UNCLOTHY_OUTPUT_UNSUPPORTED', { mimeType });
  }

  const downloadPayload = await galleryService.getAlbumPhotoDownloadPayload(task.albumId, task.profileId, task.sourcePhotoId, true);
  if (!downloadPayload?.photo) {
    throw new RequestValidationError('Source image not found.', 404, undefined, 'SOURCE_IMAGE_NOT_FOUND');
  }

  const extension = mimeToExtension(mimeType);
  const sourceLabel = downloadPayload.photo.caption || `media ${downloadPayload.photo.id}`;
  const filename = `unclothy-${task.providerTaskId}.${extension}`;
  const caption = `Unclothy - ${sourceLabel} - ${formatCaptionTimestamp()}`;
  const file = new File([new Uint8Array(outputBytes)], filename, { type: mimeType });

  const created = await galleryService.addUploadedAlbumPhoto(
    task.albumId,
    {
      file,
      input: {
        caption,
        sourceType: 'upload',
      },
    },
    { allowDuplicateContent: true },
  );

  let createdPhotoId = created.id;
  try {
    const listing = await galleryService.listAlbumPhotos(task.albumId, task.profileId, 'custom', true);
    const photos = Array.isArray(listing?.photos) ? listing.photos : null;

    if (photos && photos.length > 0) {
      let orderedIds = photos.map((photo) => photo.id).filter((id) => Number.isInteger(id) && id > 0);
      if (!orderedIds.includes(created.id)) {
        orderedIds = [...orderedIds, created.id];
      }

      orderedIds = orderedIds.filter((id) => id !== created.id);
      const sourceIndex = orderedIds.indexOf(task.sourcePhotoId);
      if (sourceIndex >= 0) {
        orderedIds.splice(sourceIndex + 1, 0, created.id);

        if (new Set(orderedIds).size === orderedIds.length) {
          const reordered = await galleryService.reorderAlbumPhotos(task.albumId, orderedIds);
          const updated = Array.isArray(reordered) ? reordered.find((photo) => photo.id === created.id) : null;
          createdPhotoId = updated?.id ?? created.id;
        }
      }
    }
  } catch {
    // Ingest succeeded; ordering can be corrected manually if this fails.
  }

  await logAdminAuditEvent({
    actorUserId: task.userId,
    targetProfileId: task.profileId,
    type: 'unclothy_task_ingested',
    targetType: 'gallery_album',
    targetId: String(task.albumId),
    details: {
      localTaskId: task.id,
      taskId: task.providerTaskId,
      albumId: task.albumId,
      sourcePhotoId: task.sourcePhotoId,
      createdPhotoId,
    },
  });

  return prisma.unclothyGenerationTask.update({
    where: { id: task.id },
    data: {
      status: UnclothyGenerationTaskStatus.completed,
      phase: UnclothyGenerationTaskPhase.done,
      percent: 100,
      statusText: 'Saved.',
      completedAt: new Date(),
      createdPhotoId,
    },
  });
}

async function advanceRunningTask(task: QueueTaskRecord) {
  if (task.phase === UnclothyGenerationTaskPhase.creating || !task.providerTaskId) {
    return createProviderTask(task);
  }

  if (task.phase === UnclothyGenerationTaskPhase.ingesting) {
    return ingestProviderOutput(task);
  }

  const payload = await getUnclothyTask(task.providerTaskId);
  const providerStatus = normalizeProviderStatus((payload as any)?.result?.status) ?? 'Unknown';

  if (isProviderFailedStatus(providerStatus)) {
    throw new Error(`Unclothy failed (${providerStatus}).`);
  }

  if (inferCompletionFromPayload(payload as any)) {
    await prisma.unclothyGenerationTask.update({
      where: { id: task.id },
      data: {
        phase: UnclothyGenerationTaskPhase.ingesting,
        percent: 92,
        providerStatus,
        statusText: 'Saving to album...',
      },
    });
    return ingestProviderOutput({ ...task, phase: UnclothyGenerationTaskPhase.ingesting, providerStatus } as QueueTaskRecord, payload);
  }

  return prisma.unclothyGenerationTask.update({
    where: { id: task.id },
    data: {
      providerStatus,
      percent: bumpPercent(task.percent, 15, 90, task.percent < 50 ? 6 : task.percent < 75 ? 4 : 2),
      statusText: 'Processing...',
    },
  });
}

async function startQueuedTasks() {
  const runningByUser = await prisma.unclothyGenerationTask.groupBy({
    by: ['userId'],
    where: { status: UnclothyGenerationTaskStatus.running },
    _count: { _all: true },
  });
  const runningCounts = new Map(runningByUser.map((entry) => [entry.userId, entry._count._all]));

  const queued = await prisma.unclothyGenerationTask.findMany({
    where: { status: UnclothyGenerationTaskStatus.queued },
    orderBy: [{ createdAt: 'asc' }],
    take: WORKER_BATCH_SIZE,
  });

  const started: QueueTaskRecord[] = [];
  for (const task of queued) {
    const runningCount = runningCounts.get(task.userId) ?? 0;
    if (runningCount >= MAX_RUNNING_TASKS_PER_USER) {
      continue;
    }

    const claimed = await prisma.unclothyGenerationTask.updateMany({
      where: {
        id: task.id,
        status: UnclothyGenerationTaskStatus.queued,
      },
      data: {
        status: UnclothyGenerationTaskStatus.running,
        phase: UnclothyGenerationTaskPhase.creating,
        percent: 7,
        statusText: 'Creating task...',
        startedAt: new Date(),
      },
    });

    if (claimed.count !== 1) {
      continue;
    }

    runningCounts.set(task.userId, runningCount + 1);
    const next = await prisma.unclothyGenerationTask.findUnique({ where: { id: task.id } });
    if (next) started.push(next);
  }

  return started;
}

export async function processUnclothyQueueOnce() {
  const lockRows = await prisma.$queryRaw<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(${WORKER_ADVISORY_LOCK_ID}) AS locked
  `;
  const lockAcquired = lockRows?.[0]?.locked === true;

  if (!lockAcquired) {
    return { started: 0, advanced: 0, failed: 0, counts: {}, locked: true };
  }

  try {
    const started = await startQueuedTasks();
    const running = await prisma.unclothyGenerationTask.findMany({
      where: { status: UnclothyGenerationTaskStatus.running },
      orderBy: [{ startedAt: 'asc' }, { createdAt: 'asc' }],
      take: WORKER_BATCH_SIZE,
    });

    let advanced = 0;
    let failed = 0;

    for (const task of running) {
      try {
        await advanceRunningTask(task);
        advanced += 1;
      } catch (error) {
        await failTask(task, error);
        failed += 1;
      }
    }

    const activeCounts = await prisma.unclothyGenerationTask.groupBy({
      by: ['status'],
      where: {
        status: {
          in: [UnclothyGenerationTaskStatus.queued, UnclothyGenerationTaskStatus.running, UnclothyGenerationTaskStatus.failed],
        },
      },
      _count: { _all: true },
    });

    return {
      started: started.length,
      advanced,
      failed,
      counts: Object.fromEntries(activeCounts.map((entry) => [entry.status, entry._count._all])),
    };
  } finally {
    await prisma.$executeRaw`SELECT pg_advisory_unlock(${WORKER_ADVISORY_LOCK_ID})`;
  }
}

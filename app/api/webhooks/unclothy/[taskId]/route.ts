import { NextResponse } from 'next/server';
import { UnclothyGenerationTaskStatus } from '@prisma/client';
import { createUnclothyEnvelope, createUnclothySuccessResponse, toUnclothyErrorResponse } from '@/lib/server/unclothy';
import {
  failUnclothyQueueTaskFromProvider,
  getUnclothyQueueTaskById,
  ingestUnclothyQueueTaskById,
} from '@/lib/server/unclothy-queue';
import { verifyUnclothyWebhookSignature } from '@/lib/server/unclothy-webhook';
import { RequestValidationError } from '@/lib/server/uploads';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ taskId: string }> };

function getResult(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const result = (payload as Record<string, unknown>).result;
  return result && typeof result === 'object' && !Array.isArray(result) ? (result as Record<string, unknown>) : null;
}

function findFirstString(obj: unknown, candidates: string[]) {
  if (!obj || typeof obj !== 'object') return null;
  for (const key of candidates) {
    const value = (obj as Record<string, unknown>)[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function extractProviderTaskId(payload: unknown) {
  const candidates = ['task_id', 'taskId', 'providerTaskId', 'provider_task_id', 'id'];
  return findFirstString(getResult(payload), candidates) || findFirstString(payload, candidates);
}

function extractProviderStatus(payload: unknown) {
  const candidates = ['status', 'state', 'status_text', 'statusText'];
  return findFirstString(getResult(payload), candidates) || findFirstString(payload, candidates);
}

function normalizeStatus(status: string | null) {
  return status?.trim().toLowerCase() || '';
}

function isFailedStatus(status: string | null) {
  const normalized = normalizeStatus(status);
  return Boolean(normalized) && (normalized.includes('fail') || normalized.includes('error'));
}

function isCompletedStatus(status: string | null) {
  const normalized = normalizeStatus(status);
  return ['completed', 'complete', 'success', 'succeeded', 'done', 'finished'].includes(normalized);
}

function hasOutput(payload: unknown) {
  const result = getResult(payload);
  if (!result) return false;
  const candidates = ['base64', 'image_base64', 'output_base64', 'result_base64', 'image', 'url', 'image_url', 'imageUrl', 'result_url', 'output_url'];
  return candidates.some((key) => {
    const value = result[key];
    return typeof value === 'string' && value.trim();
  });
}

export async function POST(request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  const signature = new URL(request.url).searchParams.get('signature');

  if (!verifyUnclothyWebhookSignature(taskId, signature)) {
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 401,
        message: 'Invalid webhook signature.',
        errorCode: 'UNCLOTHY_WEBHOOK_UNAUTHORIZED',
      }),
      { status: 401 },
    );
  }

  try {
    const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const task = await getUnclothyQueueTaskById(taskId);
    if (!task) {
      throw new RequestValidationError('Unclothy task not found.', 404, undefined, 'UNCLOTHY_TASK_NOT_FOUND');
    }

    if (task.status === UnclothyGenerationTaskStatus.completed || task.status === UnclothyGenerationTaskStatus.canceled) {
      return createUnclothySuccessResponse({ taskId, status: task.status }, 200, 'Webhook already handled.');
    }

    const callbackProviderTaskId = extractProviderTaskId(payload);
    if (callbackProviderTaskId && task.providerTaskId && callbackProviderTaskId !== task.providerTaskId) {
      throw new RequestValidationError('Webhook task id does not match the queued provider task.', 409, undefined, 'UNCLOTHY_WEBHOOK_TASK_MISMATCH');
    }

    if (!task.providerTaskId) {
      throw new RequestValidationError('Provider task id is missing.', 409, undefined, 'UNCLOTHY_TASK_ID_MISSING');
    }

    const providerStatus = extractProviderStatus(payload);
    if (isFailedStatus(providerStatus)) {
      const updated = await failUnclothyQueueTaskFromProvider(task, providerStatus);
      return createUnclothySuccessResponse(
        { taskId, status: updated.status, phase: updated.phase },
        200,
        'Webhook failure recorded.',
      );
    }

    if (providerStatus && !isCompletedStatus(providerStatus) && !hasOutput(payload)) {
      return createUnclothySuccessResponse(
        { taskId, status: task.status, providerStatus },
        202,
        'Webhook acknowledged; task is not complete yet.',
      );
    }

    const updated = await ingestUnclothyQueueTaskById(taskId, hasOutput(payload) ? payload : undefined);
    return createUnclothySuccessResponse(
      { taskId, status: updated.status, phase: updated.phase, createdPhotoId: updated.createdPhotoId },
      200,
      'Webhook ingested successfully.',
    );
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to process Unclothy webhook.');
  }
}

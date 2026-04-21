import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { requireAuthActor } from '@/lib/auth/session';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { createUnclothyEnvelope, createUnclothySuccessResponse, toUnclothyErrorResponse } from '@/lib/server/unclothy';
import {
  cancelUnclothyQueueTask,
  getUnclothyQueueTaskForUser,
  retryUnclothyQueueTask,
} from '@/lib/server/unclothy-queue';

type RouteContext = { params: Promise<{ taskId: string }> };

async function requireUnclothyActor(request: Request) {
  const actor = await requireAuthActor(request);
  if (!canMutateContent(actor.user.role)) {
    return {
      actor,
      response: NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 403,
          message: 'Forbidden',
        }),
        { status: 403 },
      ),
    };
  }

  const settings = await getAdminSettings();
  if (!settings.integrations.unclothyEnabled) {
    return {
      actor,
      response: NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 403,
          message: 'Unclothy integration is disabled.',
        }),
        { status: 403 },
      ),
    };
  }

  return { actor, response: null };
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { actor, response } = await requireUnclothyActor(request);
    if (response) return response;

    const { taskId } = await context.params;
    const task = await getUnclothyQueueTaskForUser(taskId, actor.user.id);
    if (!task) {
      return NextResponse.json(
        createUnclothyEnvelope({
          success: false,
          status: 404,
          message: 'Task not found.',
        }),
        { status: 404 },
      );
    }

    return createUnclothySuccessResponse({ task, task_id: task.id, status: task.status, is_complete: task.status === 'completed' }, 200, 'Task loaded successfully.');
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to load Unclothy task.');
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { actor, response } = await requireUnclothyActor(request);
    if (response) return response;

    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action : '';
    const { taskId } = await context.params;

    if (action === 'cancel') {
      const task = await cancelUnclothyQueueTask(taskId, actor.user.id);
      if (!task) {
        return NextResponse.json(
          createUnclothyEnvelope({
            success: false,
            status: 404,
            message: 'Task not found.',
          }),
          { status: 404 },
        );
      }
      return createUnclothySuccessResponse({ task }, 200, 'Task canceled successfully.');
    }

    if (action === 'retry') {
      const task = await retryUnclothyQueueTask(taskId, actor.user.id);
      if (!task) {
        return NextResponse.json(
          createUnclothyEnvelope({
            success: false,
            status: 404,
            message: 'Failed task not found.',
          }),
          { status: 404 },
        );
      }
      return createUnclothySuccessResponse({ task }, 200, 'Task queued for retry.');
    }

    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 400,
        message: 'Unsupported task action.',
      }),
      { status: 400 },
    );
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to update Unclothy task.');
  }
}

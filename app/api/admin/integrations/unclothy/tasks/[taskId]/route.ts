import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { requireAuthActor } from '@/lib/auth/session';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { getUnclothyTask } from '@/lib/server/unclothy';
import { toErrorResponse } from '@/lib/server/api-responses';

type RouteContext = { params: Promise<{ taskId: string }> };

function normalizeStatus(value: unknown) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function inferCompletionFromPayload(payload: any) {
  const status = normalizeStatus(payload?.result?.status);
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

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await requireAuthActor(request);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await getAdminSettings();
    if (!settings.integrations.unclothyEnabled) {
      return NextResponse.json({ error: 'Unclothy integration is disabled.' }, { status: 403 });
    }

    const { taskId } = await context.params;
    const payload = await getUnclothyTask(taskId);

    const status = normalizeStatus((payload as any)?.result?.status) ?? 'Unknown';
    const isComplete = inferCompletionFromPayload(payload as any);

    return NextResponse.json({
      taskId,
      status,
      isComplete,
      raw: payload,
    });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to load Unclothy task.');
  }
}


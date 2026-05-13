import { NextResponse } from 'next/server';
import { canMutateContent } from '@/lib/auth/roles';
import { requireAuthActor } from '@/lib/auth/session';
import { createUnclothyEnvelope, createUnclothySuccessResponse, toUnclothyErrorResponse } from '@/lib/server/unclothy';
import { processUnclothyQueueOnce } from '@/lib/server/unclothy-queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') || '';
  if (secret && secret.trim() && authorization === `Bearer ${secret.trim()}`) {
    return true;
  }

  if (process.env.VERCEL && request.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  try {
    const actor = await requireAuthActor(request);
    return canMutateContent(actor.user.role);
  } catch {
    return false;
  }
}

async function handleWorker(request: Request) {
  if (!(await isAuthorized(request))) {
    return NextResponse.json(
      createUnclothyEnvelope({
        success: false,
        status: 401,
        message: 'Unauthorized',
      }),
      { status: 401 },
    );
  }

  try {
    const result = await processUnclothyQueueOnce();
    return createUnclothySuccessResponse(result, 200, 'Unclothy worker completed one queue pass.');
  } catch (error) {
    return toUnclothyErrorResponse(error, 'Unable to process Unclothy queue.');
  }
}

export async function GET(request: Request) {
  return handleWorker(request);
}

export async function POST(request: Request) {
  return handleWorker(request);
}

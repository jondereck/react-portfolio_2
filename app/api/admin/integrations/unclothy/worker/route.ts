import { NextResponse } from 'next/server';
import { canAccessAdminModuleAction } from '@/lib/auth/module-access';
import { requireAuthActor } from '@/lib/auth/session';
import { createUnclothyEnvelope, createUnclothySuccessResponse, toUnclothyErrorResponse } from '@/lib/server/unclothy';
import { processUnclothyQueueOnce } from '@/lib/server/unclothy-queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getWorkerRequestSource(request: Request) {
  const userAgent = (request.headers.get('user-agent') || '').toLowerCase();
  if (userAgent.includes('unclothy-cron-worker')) {
    return 'cloudflare-cron-worker';
  }

  if (request.headers.get('x-vercel-cron') === '1') {
    return 'vercel-cron';
  }

  if (request.method === 'POST') {
    return 'admin-browser-fallback';
  }

  return 'unknown';
}

function hasValidCronAuthorization(request: Request) {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get('authorization') || '';
  if (secret && secret.trim() && authorization === `Bearer ${secret.trim()}`) {
    return true;
  }

  if (process.env.VERCEL && request.headers.get('x-vercel-cron') === '1') {
    return true;
  }

  return false;
}

async function hasValidAdminAuthorization(request: Request) {
  try {
    const actor = await requireAuthActor(request);
    return canAccessAdminModuleAction(actor.user.role, 'gallery', 'createUpdate');
  } catch {
    return false;
  }
}

async function handleWorker(request: Request) {
  const source = getWorkerRequestSource(request);

  // GET is reserved for cron-style invocations and should not perform
  // session/database auth lookups when the cron secret is missing.
  const cronAuthorized = hasValidCronAuthorization(request);
  const adminAuthorized =
    request.method === 'POST' && !cronAuthorized ? await hasValidAdminAuthorization(request) : false;

  console.info(
    JSON.stringify({
      tag: 'unclothy-worker-request',
      at: new Date().toISOString(),
      source,
      method: request.method,
      cronAuthorized,
      adminAuthorized,
    }),
  );

  if (!cronAuthorized && !adminAuthorized) {
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
    console.info(
      JSON.stringify({
        tag: 'unclothy-worker-request',
        at: new Date().toISOString(),
        source,
        method: request.method,
        event: 'queue-pass-complete',
        result,
      }),
    );
    return createUnclothySuccessResponse(result, 200, 'Unclothy worker completed one queue pass.');
  } catch (error) {
    console.error(
      JSON.stringify({
        tag: 'unclothy-worker-request',
        at: new Date().toISOString(),
        source,
        method: request.method,
        event: 'queue-pass-failed',
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    return toUnclothyErrorResponse(error, 'Unable to process Unclothy queue.');
  }
}

export async function GET(request: Request) {
  return handleWorker(request);
}

export async function POST(request: Request) {
  return handleWorker(request);
}

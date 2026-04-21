import { NextResponse } from 'next/server';
import { createUnclothyEnvelope, createUnclothySuccessResponse, toUnclothyErrorResponse } from '@/lib/server/unclothy';
import { processUnclothyQueueOnce } from '@/lib/server/unclothy-queue';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !secret.trim()) {
    return false;
  }

  const authorization = request.headers.get('authorization') || '';
  return authorization === `Bearer ${secret.trim()}`;
}

async function handleWorker(request: Request) {
  if (!isAuthorized(request)) {
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

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveRequestActor } from '@/lib/auth/session';
import { canManageGlobalSettings } from '@/lib/auth/roles';
import { isRateLimited } from '@/lib/server/rate-limit';
import { createFormErrorResponse } from '@/lib/server/form-responses';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';
import { isNsfwModerationConfigured, moderateImageUrlForNsfw } from '@/lib/server/nsfw-moderation';
import { isVideoUrl } from '@/lib/gallery-media';

const requestSchema = z.object({
  cursor: z.number().int().positive().nullable().optional(),
  limit: z.number().int().min(1).max(50).optional().default(20),
});

function isVideoMime(mimeType: unknown) {
  return typeof mimeType === 'string' && mimeType.toLowerCase().startsWith('video/');
}

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 30, 60_000)) {
    return createFormErrorResponse({ error: 'Too many requests. Try again later.', errorCode: 'RATE_LIMITED' }, 429);
  }

  const actor = await resolveRequestActor(request);
  if (!actor) {
    return createFormErrorResponse({ error: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }, 401);
  }
  if (!canManageGlobalSettings(actor.user.role)) {
    return createFormErrorResponse({ error: 'Forbidden', errorCode: 'FORBIDDEN' }, 403);
  }

  if (!isNsfwModerationConfigured()) {
    return createFormErrorResponse(
      { error: 'NSFW moderation is not configured. Set OPENAI_API_KEY.', errorCode: 'OPENAI_NOT_CONFIGURED' },
      503,
    );
  }

  let parsedBody: z.infer<typeof requestSchema>;
  try {
    const body = await request.json().catch(() => ({}));
    parsedBody = requestSchema.parse(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid request body.';
    return createFormErrorResponse({ error: message, errorCode: 'INVALID_REQUEST_BODY' }, 400);
  }

  const cursor = parsedBody.cursor ?? 0;
  const limit = parsedBody.limit ?? 20;

  const baseWhere = {
    nsfwDetectedAt: null as null,
    ...(cursor ? { id: { gt: cursor } } : {}),
  };

  const remainingEstimate = await prisma.albumPhoto.count({ where: baseWhere });
  const batch = await prisma.albumPhoto.findMany({
    where: baseWhere,
    orderBy: { id: 'asc' },
    take: limit,
    select: {
      id: true,
      imageUrl: true,
      mimeType: true,
      originalFilename: true,
    },
  });

  let processed = 0;
  let flagged = 0;

  const now = new Date();

  async function processOne(photo: (typeof batch)[number]) {
    processed += 1;

    const isVideo = isVideoMime(photo.mimeType) || isVideoUrl(photo.imageUrl);
    if (isVideo) {
      await prisma.albumPhoto.updateMany({
        where: { id: photo.id, nsfwDetectedAt: null },
        data: {
          nsfwDetected: false,
          nsfwDetectedAt: now,
          nsfwScores: {
            provider: 'openai',
            skipped: true,
            reason: 'video',
          } as any,
        },
      });
      return;
    }

    let moderation = null as Awaited<ReturnType<typeof moderateImageUrlForNsfw>>;
    try {
      moderation = await moderateImageUrlForNsfw({ imageUrl: photo.imageUrl });
    } catch (error) {
      await prisma.albumPhoto.updateMany({
        where: { id: photo.id, nsfwDetectedAt: null },
        data: {
          nsfwDetected: false,
          nsfwDetectedAt: now,
          nsfwScores: {
            provider: 'openai',
            error: true,
            message: error instanceof Error ? error.message : 'Moderation failed.',
            code: typeof (error as any)?.code === 'string' ? (error as any).code : undefined,
            status: typeof (error as any)?.status === 'number' ? (error as any).status : undefined,
            requestID: typeof (error as any)?.requestID === 'string' ? (error as any).requestID : undefined,
          } as any,
        },
      });
      return;
    }

    const nsfwDetected = moderation ? moderation.nsfwDetected : false;
    if (nsfwDetected) flagged += 1;

    await prisma.albumPhoto.updateMany({
      where: { id: photo.id, nsfwDetectedAt: null },
      data: {
        nsfwDetected,
        nsfwDetectedAt: now,
        nsfwScores: moderation?.nsfwScores ?? ({ provider: 'openai', skipped: true, reason: 'no_result' } as any),
      },
    });
  }

  for (let index = 0; index < batch.length; index += 2) {
    const slice = batch.slice(index, index + 2);
    await Promise.all(slice.map((photo) => processOne(photo)));
  }

  const nextCursor = batch.length > 0 ? batch[batch.length - 1].id : null;

  await logAdminAuditEvent({
    actorUserId: actor.user.id,
    type: 'gallery_nsfw_scan_batch',
    details: {
      cursor,
      limit,
      processed,
      flagged,
      nextCursor,
    },
  });

  return NextResponse.json({
    processed,
    flagged,
    nextCursor,
    remainingEstimate,
  });
}

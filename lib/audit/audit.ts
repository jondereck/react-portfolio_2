import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

type AuditPayload = {
  actorUserId?: string | null;
  targetProfileId?: number | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditEvent(payload: AuditPayload) {
  try {
    await prisma.adminAuditEvent.create({
      data: {
        actorUserId: payload.actorUserId ?? null,
        targetProfileId: payload.targetProfileId ?? null,
        action: payload.action,
        targetType: payload.targetType ?? null,
        targetId: payload.targetId ?? null,
        metadata: payload.metadata ? (payload.metadata as Prisma.InputJsonObject) : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to write admin audit event', error);
  }
}

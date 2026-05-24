import { UnclothyGenerationTaskStatus, type UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const UNCLOTHY_MONTHLY_LIMIT_MAX = 10_000;
export const UNCLOTHY_CONCURRENT_LIMIT_MAX = 5;
export const UNCLOTHY_DEFAULT_MONTHLY_LIMIT = 0;
export const UNCLOTHY_DEFAULT_CONCURRENT_LIMIT = 1;
export const UNCLOTHY_DEFAULT_GLOBAL_CONCURRENT_LIMIT = 5;

export const UNCLOTHY_QUOTA_COUNTED_STATUSES = [
  UnclothyGenerationTaskStatus.queued,
  UnclothyGenerationTaskStatus.running,
  UnclothyGenerationTaskStatus.completed,
] as const;

export type UnclothyLimitUser = {
  id: string;
  role: UserRole;
  unclothyMonthlyGenerationLimit: number;
  unclothyConcurrentGenerationLimit: number;
};

type UsageCounts = {
  queued: number;
  running: number;
  completed: number;
};

export function getUnclothyQuotaPeriod(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function isUnclothyQuotaUnlimited(role: UserRole) {
  return role === 'super_admin';
}

export function normalizeUnclothyMonthlyLimit(value: unknown) {
  const limit = Number(value);
  if (!Number.isInteger(limit)) return UNCLOTHY_DEFAULT_MONTHLY_LIMIT;
  return Math.max(0, Math.min(UNCLOTHY_MONTHLY_LIMIT_MAX, limit));
}

export function normalizeUnclothyConcurrentLimit(value: unknown, fallback = UNCLOTHY_DEFAULT_CONCURRENT_LIMIT) {
  const limit = Number(value);
  if (!Number.isInteger(limit)) return fallback;
  return Math.max(1, Math.min(UNCLOTHY_CONCURRENT_LIMIT_MAX, limit));
}

export function normalizeUnclothyGlobalConcurrentLimit(value: unknown) {
  return normalizeUnclothyConcurrentLimit(value, UNCLOTHY_DEFAULT_GLOBAL_CONCURRENT_LIMIT);
}

const emptyUsage = (): UsageCounts => ({
  queued: 0,
  running: 0,
  completed: 0,
});

export async function getUnclothyUsageCountsByUserIds(userIds: string[], period = getUnclothyQuotaPeriod()) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
  const usage = new Map<string, UsageCounts>();
  if (uniqueUserIds.length === 0) {
    return usage;
  }

  const grouped = await prisma.unclothyGenerationTask.groupBy({
    by: ['userId', 'status'],
    where: {
      userId: { in: uniqueUserIds },
      quotaPeriod: period,
      status: { in: [...UNCLOTHY_QUOTA_COUNTED_STATUSES] },
    },
    _count: { _all: true },
  });

  for (const entry of grouped) {
    const counts = usage.get(entry.userId) ?? emptyUsage();
    if (entry.status === UnclothyGenerationTaskStatus.queued) {
      counts.queued = entry._count._all;
    } else if (entry.status === UnclothyGenerationTaskStatus.running) {
      counts.running = entry._count._all;
    } else if (entry.status === UnclothyGenerationTaskStatus.completed) {
      counts.completed = entry._count._all;
    }
    usage.set(entry.userId, counts);
  }

  return usage;
}

export function buildUnclothyUsageSummary(
  user: UnclothyLimitUser,
  counts: UsageCounts | undefined,
  period = getUnclothyQuotaPeriod(),
) {
  const monthlyLimit = normalizeUnclothyMonthlyLimit(user.unclothyMonthlyGenerationLimit);
  const concurrentLimit = normalizeUnclothyConcurrentLimit(user.unclothyConcurrentGenerationLimit);
  const resolvedCounts = counts ?? emptyUsage();
  const usedThisMonth = resolvedCounts.queued + resolvedCounts.running + resolvedCounts.completed;
  const activeReserved = resolvedCounts.queued + resolvedCounts.running;
  const unlimited = isUnclothyQuotaUnlimited(user.role);

  return {
    quotaPeriod: period,
    unlimited,
    monthlyGenerationLimit: monthlyLimit,
    concurrentGenerationLimit: concurrentLimit,
    usedThisMonth,
    remainingThisMonth: unlimited ? null : Math.max(0, monthlyLimit - usedThisMonth),
    activeReserved,
    queued: resolvedCounts.queued,
    running: resolvedCounts.running,
    completed: resolvedCounts.completed,
  };
}

export async function getUnclothyUsageSummaryForUser(user: UnclothyLimitUser, period = getUnclothyQuotaPeriod()) {
  const usage = await getUnclothyUsageCountsByUserIds([user.id], period);
  return buildUnclothyUsageSummary(user, usage.get(user.id), period);
}

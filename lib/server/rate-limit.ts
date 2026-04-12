import { getAdminSettings } from '@/lib/server/admin-settings';

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }

  return 'unknown';
}

async function getEffectivePolicy(key: string, limit: number, windowMs: number) {
  const settings = await getAdminSettings();

  if (key === 'admin-login') {
    return {
      limit: settings.security.loginRateLimitMax,
      windowMs: settings.security.loginRateLimitWindowSeconds * 1000,
    };
  }

  if (key === 'contact-submit') {
    return {
      limit: settings.security.contactRateLimitMax,
      windowMs: settings.security.contactRateLimitWindowSeconds * 1000,
    };
  }

  if (key === 'admin-mutation') {
    return {
      limit: settings.security.mutationRateLimitMax,
      windowMs: settings.security.mutationRateLimitWindowSeconds * 1000,
    };
  }

  return { limit, windowMs };
}

export async function isRateLimited(request: Request, key: string, limit: number, windowMs: number): Promise<boolean> {
  const policy = await getEffectivePolicy(key, limit, windowMs);
  const now = Date.now();
  const clientIp = getClientIp(request);
  const bucketKey = `${key}:${clientIp}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + policy.windowMs,
    });
    return false;
  }

  if (existing.count >= policy.limit) {
    return true;
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return false;
}

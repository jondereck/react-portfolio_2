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

export function isRateLimited(request: Request, key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const clientIp = getClientIp(request);
  const bucketKey = `${key}:${clientIp}`;
  const existing = buckets.get(bucketKey);

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, {
      count: 1,
      resetAt: now + windowMs,
    });
    return false;
  }

  if (existing.count >= limit) {
    return true;
  }

  existing.count += 1;
  buckets.set(bucketKey, existing);
  return false;
}


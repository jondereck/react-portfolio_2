import { timingSafeEqual } from 'node:crypto';
import { hasValidAdminSession } from '@/lib/server/admin-session';

export function isAuthorizedMutation(request: Request): boolean {
  return hasValidAdminSession(request);
}

export function isAdmin(): boolean {
  return Boolean(process.env.ADMIN_API_KEY);
}

export function isValidAdminKey(input: string): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  if (!adminKey || !input) {
    return false;
  }

  const left = Buffer.from(adminKey);
  const right = Buffer.from(input);
  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

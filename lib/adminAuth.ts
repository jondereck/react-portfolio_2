import { timingSafeEqual } from 'node:crypto';
import { resolveRequestActor } from '@/lib/auth/session';
import { canMutateContent } from '@/lib/auth/roles';

export async function isAuthorizedMutation(request: Request): Promise<boolean> {
  const actor = await resolveRequestActor(request);
  return Boolean(actor && canMutateContent(actor.user.role));
}

export async function canAccessAdminContent(request: Request): Promise<boolean> {
  return Boolean(await resolveRequestActor(request));
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

import { hasValidAdminSession } from '@/lib/server/admin-session';

export function isAuthorizedMutation(request) {
  return hasValidAdminSession(request);
}

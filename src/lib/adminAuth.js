import { resolveRequestActor } from '@/lib/auth/session';
import { canMutateContent } from '@/lib/auth/roles';

export function isAuthorizedMutation(request) {
  return resolveRequestActor(request).then((actor) => Boolean(actor && canMutateContent(actor.user.role)));
}

export function canAccessAdminContent(request) {
  return resolveRequestActor(request).then(Boolean);
}

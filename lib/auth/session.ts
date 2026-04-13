import { auth } from '@/auth';
import { hasValidAdminSession } from '@/lib/server/admin-session';
import { prisma } from '@/lib/prisma';
import { LEGACY_PRIMARY_USER_ID } from '@/lib/auth/constants';
import { hasRequiredRole, isSuperAdmin } from '@/lib/auth/roles';
import type { Profile, User, UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';

export type AuthenticatedActor = {
  user: User;
  profile: Profile | null;
  source: 'authjs' | 'legacy';
};

export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });
}

export async function getCurrentProfile() {
  const user = await getCurrentUser();
  return user?.profile ?? null;
}

export async function resolveRequestActor(request?: Request): Promise<AuthenticatedActor | null> {
  const user = await getCurrentUser();
  if (user?.isActive) {
    return {
      user,
      profile: user.profile ?? null,
      source: 'authjs',
    };
  }

  if (request && (await hasValidAdminSession(request))) {
    const legacyUser = await prisma.user.findUnique({
      where: { id: LEGACY_PRIMARY_USER_ID },
      include: { profile: true },
    });
    if (legacyUser) {
      return {
        user: legacyUser,
        profile: legacyUser.profile ?? null,
        source: 'legacy',
      };
    }
  }

  return null;
}

export async function requireAuthActor(request?: Request) {
  const actor = await resolveRequestActor(request);
  if (!actor) {
    throw new Error('UNAUTHENTICATED');
  }

  return actor;
}

export async function requireRole(allowedRoles: UserRole[], request?: Request) {
  const actor = await requireAuthActor(request);
  if (!hasRequiredRole(actor.user.role, allowedRoles)) {
    throw new Error('FORBIDDEN');
  }

  return actor;
}

export async function requirePageRole(allowedRoles: UserRole[], loginPath = '/admin/login') {
  const actor = await resolveRequestActor();
  if (!actor) {
    redirect(loginPath);
  }
  if (!hasRequiredRole(actor.user.role, allowedRoles)) {
    redirect('/admin');
  }

  return actor;
}

export function canAccessProfile(actor: AuthenticatedActor, profileId: number | null) {
  if (profileId === null) {
    return false;
  }

  if (isSuperAdmin(actor.user.role)) {
    return true;
  }

  return actor.profile?.id === profileId;
}

export async function requireProfileAccess(profileId: number, request?: Request) {
  const actor = await requireAuthActor(request);
  if (!canAccessProfile(actor, profileId)) {
    throw new Error('FORBIDDEN');
  }

  return actor;
}

export async function resolveTargetProfile(options: {
  request?: Request;
  profileId?: number | null;
  profileSlug?: string | null;
}) {
  const actor = await requireAuthActor(options.request);

  const requestedProfile =
    options.profileId != null
      ? await prisma.profile.findUnique({ where: { id: options.profileId } })
      : options.profileSlug
        ? await prisma.profile.findUnique({ where: { slug: options.profileSlug } })
        : null;

  const targetProfile = requestedProfile ?? actor.profile;
  if (!targetProfile || !canAccessProfile(actor, targetProfile.id)) {
    throw new Error('FORBIDDEN');
  }

  return {
    actor,
    profile: targetProfile,
  };
}

import { prisma } from '@/lib/prisma';
import { ensureUserProfile } from '@/lib/auth/user-profiles';
import { getNeonAuth, isNeonAuthConfigured } from '@/lib/auth/neon-server';

export type NeonSessionResolutionState = 'active' | 'pending' | 'suspended';

export type ResolvedNeonLocalUser = {
  profile: Awaited<ReturnType<typeof prisma.profile.findUnique>>;
  state: NeonSessionResolutionState;
  user: Awaited<ReturnType<typeof prisma.user.findUnique>>;
};

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function deriveLocalUserState(user: { isActive: boolean; emailVerified: Date | null; role: string }) {
  if (user.role === 'super_admin') {
    return user.isActive ? 'active' : 'suspended';
  }

  if (!user.emailVerified) {
    return 'pending';
  }

  return user.isActive ? 'active' : 'suspended';
}

export async function syncNeonSessionToLocalUser() {
  if (!isNeonAuthConfigured()) {
    return null;
  }

  const auth = getNeonAuth();
  if (!auth) {
    return null;
  }

  const { data: session, error } = await auth.getSession();
  if (error || !session?.user?.id || !session.user.email) {
    return null;
  }

  const neonAuthUserId = String(session.user.id);
  const normalizedEmail = normalizeEmail(session.user.email);
  const displayName =
    typeof session.user.name === 'string' && session.user.name.trim().length > 0
      ? session.user.name.trim()
      : normalizedEmail.split('@')[0] || 'Pending User';
  const image = typeof session.user.image === 'string' && session.user.image.trim() ? session.user.image.trim() : null;

  const resolved = await prisma.$transaction(async (tx) => {
    const byNeonId = await tx.user.findUnique({
      where: { neonAuthUserId },
      include: { profile: true },
    });

    if (byNeonId) {
      const profile =
        byNeonId.profile ??
        (await ensureUserProfile(tx, byNeonId.id, byNeonId.name ?? displayName, byNeonId.name ?? displayName));

      const updatedUser =
        image && !byNeonId.image
          ? await tx.user.update({
              where: { id: byNeonId.id },
              data: { image },
              include: { profile: true },
            })
          : byNeonId;

      return {
        profile,
        user: updatedUser,
      };
    }

    const byEmail = await tx.user.findUnique({
      where: { email: normalizedEmail },
      include: { profile: true },
    });

    if (byEmail) {
      if (byEmail.neonAuthUserId && byEmail.neonAuthUserId !== neonAuthUserId) {
        throw new Error('NEON_AUTH_LINK_CONFLICT');
      }

      const updatedUser = await tx.user.update({
        where: { id: byEmail.id },
        data: {
          neonAuthUserId,
          ...(image && !byEmail.image ? { image } : {}),
        },
        include: { profile: true },
      });

      const profile =
        updatedUser.profile ??
        (await ensureUserProfile(
          tx,
          updatedUser.id,
          updatedUser.name ?? displayName,
          updatedUser.name ?? normalizedEmail.split('@')[0] ?? normalizedEmail,
        ));

      return {
        profile,
        user: updatedUser,
      };
    }

    const createdUser = await tx.user.create({
      data: {
        email: normalizedEmail,
        name: displayName,
        image,
        role: 'viewer',
        isActive: false,
        emailVerified: null,
        neonAuthUserId,
      },
      include: { profile: true },
    });

    const profile = await ensureUserProfile(
      tx,
      createdUser.id,
      createdUser.name ?? displayName,
      createdUser.name ?? normalizedEmail.split('@')[0] ?? normalizedEmail,
    );

    return {
      profile,
      user: createdUser,
    };
  });

  return {
    profile: resolved.profile,
    state: deriveLocalUserState(resolved.user),
    user: resolved.user,
  } as ResolvedNeonLocalUser;
}

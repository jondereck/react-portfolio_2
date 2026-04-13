import { prisma } from '@/lib/prisma';
import { LEGACY_PRIMARY_PROFILE_SLUG, LEGACY_PRIMARY_USER_ID } from '@/lib/auth/constants';

export async function getPrimaryProfile() {
  return prisma.profile.findFirst({
    where: { isPrimary: true },
  });
}

export async function getProfileBySlug(slug: string) {
  return prisma.profile.findUnique({
    where: { slug },
  });
}

export async function ensurePrimaryProfile() {
  const existing = await getPrimaryProfile();
  if (existing) {
    return existing;
  }

  const user = await prisma.user.upsert({
    where: { id: LEGACY_PRIMARY_USER_ID },
    update: {},
    create: {
      id: LEGACY_PRIMARY_USER_ID,
      email: 'admin@example.com',
      name: 'Primary Admin',
      role: 'super_admin',
      isActive: false,
    },
  });

  return prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      isPrimary: true,
      isPublic: true,
      slug: LEGACY_PRIMARY_PROFILE_SLUG,
      displayName: user.name || 'Primary Admin',
    },
    create: {
      id: 1,
      userId: user.id,
      slug: LEGACY_PRIMARY_PROFILE_SLUG,
      displayName: user.name || 'Primary Admin',
      isPrimary: true,
      isPublic: true,
    },
  });
}

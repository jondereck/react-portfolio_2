import { prisma } from '@/lib/prisma';
import { writeAuditEvent } from '@/lib/audit/audit';
import { hashPassword, verifyPassword } from '@/lib/password/password';
import { getGoogleProfileForUser } from '@/lib/auth/google-drive';

function normalizeEmail(value: string | null | undefined) {
  return String(value || '').trim().toLowerCase();
}

export async function getSelfAccount(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  let image = user.image ?? '';
  try {
    const googleProfile = await getGoogleProfileForUser(user.id);
    const googleEmailMatchesUser = Boolean(
      googleProfile?.email && normalizeEmail(googleProfile.email) === normalizeEmail(user.email),
    );

    if (!image && googleEmailMatchesUser && googleProfile?.picture) {
      await prisma.user.update({
        where: { id: user.id },
        data: { image: googleProfile.picture },
      });
      image = googleProfile.picture;
    } else if (
      image &&
      !googleEmailMatchesUser &&
      googleProfile?.picture &&
      image.trim() === googleProfile.picture.trim()
    ) {
        await prisma.user.update({
          where: { id: user.id },
          data: { image: null },
        });
        image = '';
    }
  } catch {
    if (!image) image = '';
  }

  return {
    id: user.id,
    name: user.name ?? '',
    email: user.email,
    image,
    role: user.role,
    isActive: user.isActive,
    profile: user.profile,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export async function updateSelfAccount(input: {
  userId: string;
  name: string;
  email: string;
  currentPassword?: string;
  newPassword?: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const currentPassword = input.currentPassword?.trim() ?? '';
  const newPassword = input.newPassword?.trim() ?? '';

  if (!name || !email) {
    throw new Error('INVALID_INPUT');
  }

  const existing = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      profile: true,
    },
  });

  if (!existing) {
    throw new Error('USER_NOT_FOUND');
  }

  const needsPasswordCheck = email !== existing.email || Boolean(newPassword);
  if (needsPasswordCheck) {
    if (!currentPassword || !verifyPassword(currentPassword, existing.passwordHash)) {
      throw new Error('INVALID_CURRENT_PASSWORD');
    }
  }

  const emailOwner = await prisma.user.findUnique({
    where: { email },
  });

  if (emailOwner && emailOwner.id !== existing.id) {
    throw new Error('EMAIL_IN_USE');
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name,
      email,
      ...(newPassword ? { passwordHash: hashPassword(newPassword) } : {}),
      profile: existing.profile
        ? {
            update: {
              displayName: name,
            },
          }
        : undefined,
    },
    include: {
      profile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
    },
  });

  if (newPassword) {
    await prisma.session.deleteMany({
      where: {
        userId: existing.id,
      },
    });
  }

  await writeAuditEvent({
    actorUserId: existing.id,
    targetProfileId: updated.profile?.id ?? null,
    action: 'self_account_updated',
    targetType: 'user',
    targetId: updated.id,
    metadata: {
      emailChanged: email !== existing.email,
      passwordChanged: Boolean(newPassword),
      nameChanged: name !== (existing.name ?? ''),
    },
  });

  return {
    id: updated.id,
    name: updated.name ?? '',
    email: updated.email,
    image: updated.image ?? '',
    role: updated.role,
    isActive: updated.isActive,
    profile: updated.profile,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    passwordChanged: Boolean(newPassword),
  };
}

export async function updateSelfAccountNeon(input: {
  userId: string;
  name: string;
  email: string;
  passwordChanged?: boolean;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();

  if (!name || !email) {
    throw new Error('INVALID_INPUT');
  }

  const existing = await prisma.user.findUnique({
    where: { id: input.userId },
    include: {
      profile: true,
    },
  });

  if (!existing) {
    throw new Error('USER_NOT_FOUND');
  }

  const emailOwner = await prisma.user.findUnique({
    where: { email },
  });

  if (emailOwner && emailOwner.id !== existing.id) {
    throw new Error('EMAIL_IN_USE');
  }

  const updated = await prisma.user.update({
    where: { id: existing.id },
    data: {
      name,
      email,
      profile: existing.profile
        ? {
            update: {
              displayName: name,
            },
          }
        : undefined,
    },
    include: {
      profile: {
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      },
    },
  });

  await writeAuditEvent({
    actorUserId: existing.id,
    targetProfileId: updated.profile?.id ?? null,
    action: 'self_account_updated',
    targetType: 'user',
    targetId: updated.id,
    metadata: {
      emailChanged: email !== existing.email,
      passwordChanged: Boolean(input.passwordChanged),
      nameChanged: name !== (existing.name ?? ''),
      source: 'neon',
    },
  });

  return {
    id: updated.id,
    name: updated.name ?? '',
    email: updated.email,
    image: updated.image ?? '',
    role: updated.role,
    isActive: updated.isActive,
    profile: updated.profile,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    passwordChanged: Boolean(input.passwordChanged),
  };
}

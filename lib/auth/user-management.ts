import { randomBytes } from 'node:crypto';
import type { UserRole } from '@prisma/client';
import { Resend } from 'resend';
import { prisma } from '@/lib/prisma';
import { writeAuditEvent } from '@/lib/audit/audit';
import { getAdminSettings } from '@/lib/server/admin-settings';
import { hashPassword } from '@/lib/password/password';
import { ensureSiteConfigForProfile, ensureSiteContentForProfile } from '@/lib/profile/site-data';
import { slugify } from '@/src/modules/gallery/domain/slug';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const INVITABLE_ROLES: UserRole[] = ['admin', 'editor', 'viewer'];
const INVITE_TTL_MS = 1000 * 60 * 60 * 24;

function assertInvitableRole(role: string): asserts role is UserRole {
  if (!INVITABLE_ROLES.includes(role as UserRole)) {
    throw new Error('INVALID_ROLE');
  }
}

async function generateUniqueProfileSlug(seed: string) {
  const base = slugify(seed) || `user-${Date.now()}`;
  let slug = base;
  let counter = 2;

  while (await prisma.profile.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

async function ensureUserProfile(userId: string, displayName: string, slugSeed: string) {
  const existing = await prisma.profile.findUnique({ where: { userId } });
  if (existing) {
    await ensureSiteContentForProfile(existing.id);
    await ensureSiteConfigForProfile(existing.id);
    return existing;
  }

  const slug = await generateUniqueProfileSlug(slugSeed);
  const profile = await prisma.profile.create({
    data: {
      userId,
      slug,
      displayName,
      isPublic: true,
      isPrimary: false,
    },
  });

  await ensureSiteContentForProfile(profile.id);
  await ensureSiteConfigForProfile(profile.id);
  return profile;
}

async function createInviteToken(email: string) {
  const token = randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + INVITE_TTL_MS);

  await prisma.verificationToken.deleteMany({
    where: { identifier: email },
  });

  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token,
      expires,
    },
  });

  return { token, expires };
}

async function sendInviteEmail(options: {
  email: string;
  name: string;
  role: UserRole;
  activationLink: string;
}) {
  if (!resend) {
    throw new Error('EMAIL_NOT_CONFIGURED');
  }

  const settings = await getAdminSettings();
  const result = await resend.emails.send({
    from: `${settings.integrations.contactSenderName} <${settings.integrations.contactSenderEmail}>`,
    to: options.email,
    subject: 'Activate your admin account',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0f172a">
        <h2 style="margin-bottom:8px">Admin account invitation</h2>
        <p>Hello ${options.name},</p>
        <p>You were invited to the admin workspace as <strong>${options.role}</strong>.</p>
        <p>Verify your email and set your password using the link below:</p>
        <p><a href="${options.activationLink}">${options.activationLink}</a></p>
        <p>This link expires in 24 hours.</p>
      </div>
    `,
  });

  if (result.error) {
    throw new Error(result.error.message || 'EMAIL_SEND_FAILED');
  }
}

export async function listManagedUsers() {
  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: 'asc' }],
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

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    emailVerified: user.emailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    profile: user.profile,
    needsActivation: !user.emailVerified || !user.passwordHash,
  }));
}

export async function inviteManagedUser(input: {
  actorUserId: string;
  name: string;
  email: string;
  role: string;
  appOrigin: string;
}) {
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const role = input.role.trim();

  if (!name || !email) {
    throw new Error('INVALID_INPUT');
  }

  assertInvitableRole(role);

  const existing = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (existing?.role === 'super_admin') {
    throw new Error('SUPER_ADMIN_LOCKED');
  }
  if (existing?.emailVerified && existing?.passwordHash) {
    throw new Error('ACCOUNT_ALREADY_ACTIVE');
  }

  const user = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: {
          name,
          role,
          isActive: true,
          emailVerified: null,
          passwordHash: null,
        },
      })
    : await prisma.user.create({
        data: {
          name,
          email,
          role,
          isActive: true,
          emailVerified: null,
          passwordHash: null,
        },
      });

  const profile = await ensureUserProfile(user.id, name, name || email.split('@')[0] || email);
  const { token, expires } = await createInviteToken(email);
  const activationLink = new URL('/activate-account', input.appOrigin);
  activationLink.searchParams.set('token', token);
  activationLink.searchParams.set('email', email);

  await sendInviteEmail({
    email,
    name,
    role,
    activationLink: activationLink.toString(),
  });

  await writeAuditEvent({
    actorUserId: input.actorUserId,
    targetProfileId: profile.id,
    action: existing ? 'user_reinvited' : 'user_invited',
    targetType: 'user',
    targetId: user.id,
    metadata: { email, role },
  });

  return {
    id: user.id,
    email,
    role,
    expires,
  };
}

export async function activateManagedUser(input: {
  email: string;
  token: string;
  password: string;
}) {
  const email = input.email.trim().toLowerCase();
  const token = input.token.trim();

  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: email,
        token,
      },
    },
  });

  if (!record) {
    throw new Error('INVALID_TOKEN');
  }

  if (record.expires.getTime() < Date.now()) {
    await prisma.verificationToken.deleteMany({ where: { identifier: email } });
    throw new Error('TOKEN_EXPIRED');
  }

  const user = await prisma.user.findUnique({
    where: { email },
    include: { profile: true },
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  const passwordHash = hashPassword(input.password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      emailVerified: new Date(),
      isActive: true,
    },
  });

  await prisma.verificationToken.deleteMany({ where: { identifier: email } });

  await writeAuditEvent({
    actorUserId: user.id,
    targetProfileId: user.profile?.id ?? null,
    action: 'user_activated',
    targetType: 'user',
    targetId: user.id,
    metadata: { email },
  });

  return {
    email: user.email,
    role: user.role,
  };
}

export async function validateActivationToken(email: string, token: string) {
  const record = await prisma.verificationToken.findUnique({
    where: {
      identifier_token: {
        identifier: email.trim().toLowerCase(),
        token: token.trim(),
      },
    },
  });

  if (!record) {
    return { ok: false, reason: 'invalid' as const };
  }

  if (record.expires.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' as const };
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { name: true, email: true, role: true },
  });

  if (!user) {
    return { ok: false, reason: 'missing_user' as const };
  }

  return {
    ok: true as const,
    user,
    expires: record.expires,
  };
}

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { LEGACY_PRIMARY_PROFILE_ID, LEGACY_PRIMARY_PROFILE_SLUG, LEGACY_PRIMARY_USER_ID } from '../lib/auth/constants';
import { defaultAdminSettings } from '../lib/adminSettingsDefaults';
import { hashPassword } from '../lib/password/password';
import { defaultSiteConfig, defaultSiteContent } from '../lib/siteContentDefaults';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD?.trim() || 'ChangeMe12345';
  const displayName = process.env.ADMIN_NAME?.trim() || 'Primary Admin';

  const existingById = await prisma.user.findUnique({
    where: { id: LEGACY_PRIMARY_USER_ID },
    include: { profile: true },
  });

  const existingByEmail = existingById
    ? null
    : await prisma.user.findUnique({
        where: { email },
        include: { profile: true },
      });

  const baseUser = existingById ?? existingByEmail;
  const passwordHash = hashPassword(password);

  const user = baseUser
    ? await prisma.user.update({
        where: { id: baseUser.id },
        data: {
          email,
          name: displayName,
          role: 'super_admin',
          isActive: true,
          passwordHash,
        },
      })
    : await prisma.user.create({
        data: {
          id: LEGACY_PRIMARY_USER_ID,
          email,
          name: displayName,
          role: 'super_admin',
          isActive: true,
          passwordHash,
        },
      });

  const existingProfile =
    baseUser?.profile ??
    (await prisma.profile.findUnique({
      where: { id: LEGACY_PRIMARY_PROFILE_ID },
    }));

  const profile = existingProfile
    ? await prisma.profile.update({
        where: { id: existingProfile.id },
        data: {
          userId: user.id,
          slug: LEGACY_PRIMARY_PROFILE_SLUG,
          displayName,
          isPrimary: true,
          isPublic: true,
        },
      })
    : await prisma.profile.create({
        data: {
          id: LEGACY_PRIMARY_PROFILE_ID,
          userId: user.id,
          slug: LEGACY_PRIMARY_PROFILE_SLUG,
          displayName,
          isPrimary: true,
          isPublic: true,
        },
      });

  await prisma.siteContent.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
      hero: defaultSiteContent.hero,
      about: defaultSiteContent.about,
      contact: defaultSiteContent.contact,
      seo: defaultSiteContent.seo,
    },
  });

  await prisma.siteConfig.upsert({
    where: { profileId: profile.id },
    update: {},
    create: {
      profileId: profile.id,
      logoText: defaultSiteConfig.logoText,
      logoImage: defaultSiteConfig.logoImage,
      navigation: defaultSiteConfig.navigation,
    },
  });

  await prisma.adminSettings.upsert({
    where: { id: 1 },
    update: {},
    create: defaultAdminSettings,
  });

  console.log(`Bootstrapped super admin ${email} on profile ${profile.slug}.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

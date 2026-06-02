import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { defaultSiteConfig, defaultSiteContent } from '@/lib/siteContentDefaults';
import { ensurePrimaryProfile } from '@/lib/profile/profile';

export async function ensureSiteContentForProfile(profileId: number) {
  await prisma.siteContent.upsert({
    where: { profileId },
    update: {},
    create: {
      profileId,
      hero: defaultSiteContent.hero,
      about: defaultSiteContent.about,
      contact: defaultSiteContent.contact,
      seo: defaultSiteContent.seo,
    },
  });
}

export async function ensureSiteConfigForProfile(profileId: number) {
  await prisma.siteConfig.upsert({
    where: { profileId },
    update: {},
    create: {
      profileId,
      logoText: defaultSiteConfig.logoText,
      logoImage: defaultSiteConfig.logoImage,
      navigation: defaultSiteConfig.navigation,
      portfolioTheme: defaultSiteConfig.portfolioTheme,
      portfolioThemeRotationMinutes: defaultSiteConfig.portfolioThemeRotationMinutes,
      portfolioThemeRandomPool: defaultSiteConfig.portfolioThemeRandomPool,
    },
  });
}

export async function syncPrimaryProfileContactEmail(email: string) {
  const profile = await ensurePrimaryProfile();
  await ensureSiteContentForProfile(profile.id);

  const siteContent = await prisma.siteContent.findUnique({
    where: { profileId: profile.id },
    select: { contact: true },
  });
  const currentContact =
    siteContent?.contact && typeof siteContent.contact === 'object' && !Array.isArray(siteContent.contact)
      ? siteContent.contact
      : {};

  await prisma.siteContent.update({
    where: { profileId: profile.id },
    data: {
      contact: {
        ...currentContact,
        email,
      } as Prisma.InputJsonObject,
    },
  });
}

import { prisma } from '@/lib/prisma';
import { defaultSiteConfig, defaultSiteContent } from '@/lib/siteContentDefaults';

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
      portfolioThemeRandomPool: defaultSiteConfig.portfolioThemeRandomPool,
    },
  });
}

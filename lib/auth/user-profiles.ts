import type { Prisma, PrismaClient, Profile } from '@prisma/client';
import { defaultSiteConfig, defaultSiteContent } from '@/lib/siteContentDefaults';
import { slugify } from '@/src/modules/gallery/domain/slug';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function generateUniqueProfileSlug(db: DbClient, seed: string) {
  const base = slugify(seed) || `user-${Date.now()}`;
  let slug = base;
  let counter = 2;

  while (await db.profile.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`;
    counter += 1;
  }

  return slug;
}

export async function ensureSiteDataForProfile(db: DbClient, profileId: number) {
  await db.siteContent.upsert({
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

  await db.siteConfig.upsert({
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

export async function ensureUserProfile(
  db: DbClient,
  userId: string,
  displayName: string,
  slugSeed: string,
): Promise<Profile> {
  const existing = await db.profile.findUnique({ where: { userId } });
  if (existing) {
    await ensureSiteDataForProfile(db, existing.id);
    return existing;
  }

  const slug = await generateUniqueProfileSlug(db, slugSeed);
  const profile = await db.profile.create({
    data: {
      userId,
      slug,
      displayName,
      isPublic: true,
      isPrimary: false,
    },
  });

  await ensureSiteDataForProfile(db, profile.id);
  return profile;
}

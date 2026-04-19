import { cache } from 'react';
import { prisma } from '@/lib/prisma';
import { ensurePrimaryProfile } from '@/lib/profile/profile';
import { ensureSiteConfigForProfile } from '@/lib/profile/site-data';
import { defaultSiteConfig } from '@/lib/siteContentDefaults';
import { isSafeHttpUrl } from '@/lib/url-safety';

export const BRAND_THEME_COLOR = '#020617';
export const BRAND_BACKGROUND_COLOR = '#020617';

export const getPrimarySiteBranding = cache(async () => {
  const profile = await ensurePrimaryProfile();
  await ensureSiteConfigForProfile(profile.id);

  const config = await prisma.siteConfig.findUnique({
    where: { profileId: profile.id },
    select: {
      logoText: true,
      logoImage: true,
    },
  });

  const logoText =
    typeof config?.logoText === 'string' && config.logoText.trim().length > 0
      ? config.logoText.trim()
      : defaultSiteConfig.logoText;
  const logoImage =
    typeof config?.logoImage === 'string' && isSafeHttpUrl(config.logoImage)
      ? config.logoImage.trim()
      : '';

  return {
    logoText,
    logoImage,
    themeColor: BRAND_THEME_COLOR,
    backgroundColor: BRAND_BACKGROUND_COLOR,
  };
});

export const resolveBrandLogoUrl = (request: Request, logoImage: string) =>
  logoImage || new URL('/logo512.png', request.url).toString();

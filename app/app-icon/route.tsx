/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import {
  BRAND_BACKGROUND_COLOR,
  BRAND_THEME_COLOR,
  getPrimarySiteBranding,
  resolveBrandLogoUrl,
} from '@/lib/server/site-branding';

export const runtime = 'nodejs';

const clampSize = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(96, Math.min(1024, parsed));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const size = clampSize(searchParams.get('size'), 512);
  const maskable = searchParams.get('maskable') === '1';
  const branding = await getPrimarySiteBranding();
  const logoSrc = resolveBrandLogoUrl(request, branding.logoImage);
  const logoBoxSize = Math.round(size * (maskable ? 0.52 : 0.66));

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `linear-gradient(180deg, ${BRAND_THEME_COLOR} 0%, ${BRAND_BACKGROUND_COLOR} 100%)`,
          padding: maskable ? `${Math.round(size * 0.18)}px` : `${Math.round(size * 0.12)}px`,
        }}
      >
        <div
          style={{
            width: `${logoBoxSize}px`,
            height: `${logoBoxSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `${Math.round(size * 0.18)}px`,
            background: 'rgba(255,255,255,0.08)',
            boxShadow: '0 22px 60px rgba(15, 23, 42, 0.45)',
            overflow: 'hidden',
          }}
        >
          <img
            src={logoSrc}
            alt=""
            width={logoBoxSize}
            height={logoBoxSize}
            style={{
              width: `${logoBoxSize}px`,
              height: `${logoBoxSize}px`,
              objectFit: 'contain',
            }}
          />
        </div>
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  );
}

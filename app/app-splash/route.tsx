/* eslint-disable @next/next/no-img-element */
import { ImageResponse } from 'next/og';
import {
  BRAND_BACKGROUND_COLOR,
  BRAND_THEME_COLOR,
  getPrimarySiteBranding,
  resolveBrandLogoUrl,
} from '@/lib/server/site-branding';

export const runtime = 'nodejs';

const clampDimension = (value: string | null, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(320, Math.min(4096, parsed));
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const width = clampDimension(searchParams.get('w'), 1242);
  const height = clampDimension(searchParams.get('h'), 2688);
  const branding = await getPrimarySiteBranding();
  const logoSrc = resolveBrandLogoUrl(request, branding.logoImage);
  const logoBoxSize = Math.round(Math.min(width, height) * 0.28);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: `${Math.round(Math.min(width, height) * 0.04)}px`,
          background: `radial-gradient(circle at top, rgba(30, 41, 59, 0.85), ${BRAND_BACKGROUND_COLOR} 58%)`,
          color: '#f8fafc',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: `${logoBoxSize}px`,
            height: `${logoBoxSize}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: `${Math.round(Math.min(width, height) * 0.08)}px`,
            background: 'rgba(255,255,255,0.08)',
            boxShadow: '0 28px 90px rgba(15, 23, 42, 0.5)',
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
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: `${Math.round(Math.min(width, height) * 0.012)}px`,
          }}
        >
          <div
            style={{
              fontSize: `${Math.round(Math.min(width, height) * 0.06)}px`,
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            {branding.logoText}
          </div>
          <div
            style={{
              fontSize: `${Math.round(Math.min(width, height) * 0.022)}px`,
              opacity: 0.72,
            }}
          >
            Launching portfolio
          </div>
        </div>
      </div>
    ),
    {
      width,
      height,
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
      },
    },
  );
}

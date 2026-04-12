import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { defaultSiteConfig } from '@/lib/siteContentDefaults';
import { isRateLimited } from '@/lib/server/rate-limit';
import { siteConfigSchema } from '@/lib/validators';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';

async function ensureSiteConfig() {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      logoText: defaultSiteConfig.logoText,
      logoImage: defaultSiteConfig.logoImage,
      navigation: defaultSiteConfig.navigation,
    },
  });
}

type ConfigPayload = {
  logoText?: unknown;
  logoImage?: unknown;
  navigation?: unknown;
};

const extractConfigPayload = (input: unknown): ConfigPayload | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const body = input as { data?: unknown; logoText?: unknown; logoImage?: unknown; navigation?: unknown };
  if (body.data && typeof body.data === 'object') {
    const nested = body.data as { logoText?: unknown; logoImage?: unknown; navigation?: unknown };
    return {
      logoText: nested.logoText,
      logoImage: nested.logoImage,
      navigation: nested.navigation,
    };
  }

  return {
    logoText: body.logoText,
    logoImage: body.logoImage,
    navigation: body.navigation,
  };
};

const normalizeSiteConfig = (config: { logoText: string | null; logoImage: string | null; navigation: unknown } | null) => {
  const parsed = siteConfigSchema.partial().safeParse({
    logoText: typeof config?.logoText === 'string' ? config.logoText : defaultSiteConfig.logoText,
    logoImage: typeof config?.logoImage === 'string' ? config.logoImage : defaultSiteConfig.logoImage,
    navigation: config?.navigation ?? defaultSiteConfig.navigation,
  });

  if (!parsed.success) {
    return defaultSiteConfig;
  }

  return {
    logoText: parsed.data.logoText ?? defaultSiteConfig.logoText,
    logoImage: parsed.data.logoImage ?? defaultSiteConfig.logoImage,
    navigation: parsed.data.navigation ?? defaultSiteConfig.navigation,
  };
};

export async function GET() {
  await ensureSiteConfig();
  const config = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json(normalizeSiteConfig(config));
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = extractConfigPayload(body);
    if (!payload) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const parsed = siteConfigSchema.partial().safeParse({
      logoText: typeof payload.logoText === 'string' ? payload.logoText.trim() : payload.logoText,
      logoImage: typeof payload.logoImage === 'string' ? payload.logoImage.trim() : payload.logoImage,
      navigation: payload.navigation,
    });

    if (!parsed.success) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    if (!parsed.data.logoText && !parsed.data.logoImage && !parsed.data.navigation) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const current = await prisma.siteConfig.findUnique({ where: { id: 1 } });
    const normalizedCurrent = normalizeSiteConfig(current);
    const updated = await prisma.siteConfig.upsert({
      where: { id: 1 },
      update: {
        logoText: parsed.data.logoText ?? normalizedCurrent.logoText ?? null,
        logoImage: parsed.data.logoImage ?? normalizedCurrent.logoImage ?? null,
        navigation: parsed.data.navigation ?? normalizedCurrent.navigation ?? defaultSiteConfig.navigation,
      },
      create: {
        id: 1,
        logoText: parsed.data.logoText ?? normalizedCurrent.logoText ?? defaultSiteConfig.logoText,
        logoImage: parsed.data.logoImage ?? normalizedCurrent.logoImage ?? null,
        navigation: parsed.data.navigation ?? normalizedCurrent.navigation ?? defaultSiteConfig.navigation,
      },
    });

    await logAdminAuditEvent({
      type: 'settings_updated',
      details: {
        scope: [
          parsed.data.navigation ? 'navigation' : null,
          parsed.data.logoText !== undefined || parsed.data.logoImage !== undefined ? 'branding' : null,
        ].filter(Boolean),
      },
    });

    return NextResponse.json(normalizeSiteConfig(updated));
  } catch (error) {
    console.error('Failed to update site config', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

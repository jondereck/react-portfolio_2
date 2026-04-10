import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { defaultSiteConfig } from '@/lib/siteContentDefaults';

async function ensureSiteConfig() {
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      logoText: defaultSiteConfig.logoText,
      logoImage: defaultSiteConfig.logoImage,
    },
  });
}

type ConfigPayload = {
  logoText?: unknown;
  logoImage?: unknown;
};

const extractConfigPayload = (input: unknown): ConfigPayload | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const body = input as { data?: unknown; logoText?: unknown; logoImage?: unknown };
  if (body.data && typeof body.data === 'object') {
    const nested = body.data as { logoText?: unknown; logoImage?: unknown };
    return {
      logoText: nested.logoText,
      logoImage: nested.logoImage,
    };
  }

  return {
    logoText: body.logoText,
    logoImage: body.logoImage,
  };
};

export async function GET() {
  await ensureSiteConfig();
  const config = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  return NextResponse.json(config);
}

export async function PUT(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const payload = extractConfigPayload(body);
    if (!payload) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    const logoText = typeof payload.logoText === 'string' ? payload.logoText.trim() : '';
    const logoImageInput = typeof payload.logoImage === 'string' ? payload.logoImage.trim() : '';

    if (logoText.length > 80) {
      return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
    }

    if (logoImageInput) {
      try {
        new URL(logoImageInput);
      } catch {
        return NextResponse.json({ message: 'Invalid payload' }, { status: 400 });
      }
    }

    const updated = await prisma.siteConfig.upsert({
      where: { id: 1 },
      update: {
        logoText: logoText || null,
        logoImage: logoImageInput || null,
      },
      create: {
        id: 1,
        logoText: logoText || defaultSiteConfig.logoText,
        logoImage: logoImageInput || null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update site config', error);
    return NextResponse.json({ message: 'Server error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { defaultSiteConfig } from '@/lib/siteContentDefaults';
import { siteConfigSchema } from '@/lib/validators';

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
    await ensureSiteConfig();
    const payload = await request.json();
    const parsed = siteConfigSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid site config payload' }, { status: 400 });
    }

    const config = await prisma.siteConfig.update({
      where: { id: 1 },
      data: {
        logoText: parsed.data.logoText ?? null,
        logoImage: parsed.data.logoImage ?? null,
      },
    });

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to update site config', error);
    return NextResponse.json({ error: 'Unable to update site config' }, { status: 500 });
  }
}

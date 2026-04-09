import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { aboutSchema, heroSchema } from '@/lib/validators';
import { defaultSiteContent } from '@/lib/siteContentDefaults';

async function ensureSiteContent() {
  await prisma.siteContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      hero: defaultSiteContent.hero,
      about: defaultSiteContent.about,
    },
  });
}

export async function GET() {
  await ensureSiteContent();
  const siteContent = await prisma.siteContent.findUnique({ where: { id: 1 } });
  return NextResponse.json(siteContent);
}

export async function PUT(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSiteContent();
    const payload = await request.json();
    if (!payload.hero && !payload.about) {
      return NextResponse.json({ error: 'Provide hero or about payload.' }, { status: 400 });
    }

    const updates: { hero?: Record<string, unknown>; about?: Record<string, unknown> } = {};

    if (payload.hero) {
      const parsedHero = heroSchema.partial().safeParse(payload.hero);
      if (!parsedHero.success) {
        return NextResponse.json({ error: 'Invalid hero payload' }, { status: 400 });
      }
      updates.hero = parsedHero.data;
    }

    if (payload.about) {
      const parsedAbout = aboutSchema.partial({ highlights: true }).safeParse(payload.about);
      if (!parsedAbout.success) {
        return NextResponse.json({ error: 'Invalid about payload' }, { status: 400 });
      }
      updates.about = parsedAbout.data;
    }

    const result = await prisma.siteContent.update({ where: { id: 1 }, data: updates });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update site content', error);
    return NextResponse.json({ error: 'Unable to update site content' }, { status: 500 });
  }
}

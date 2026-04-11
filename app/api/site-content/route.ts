import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { aboutSchema, heroSchema, contactSchema, seoSchema } from '@/lib/validators';
import { defaultSiteContent } from '@/lib/siteContentDefaults';
import { isRateLimited } from '@/lib/server/rate-limit';

type UpdateRequestPayload = {
  hero?: Record<string, unknown>;
  about?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  seo?: Record<string, unknown>;
};

async function ensureSiteContent() {
  await prisma.siteContent.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      hero: defaultSiteContent.hero,
      about: defaultSiteContent.about,
      contact: defaultSiteContent.contact,
      seo: defaultSiteContent.seo,
    },
  });
}

export async function GET() {
  await ensureSiteContent();
  const siteContent = await prisma.siteContent.findUnique({ where: { id: 1 } });
  return NextResponse.json(siteContent);
}

export async function PUT(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await ensureSiteContent();
    const payload = (await request.json()) as UpdateRequestPayload;
    if (!payload.hero && !payload.about && !payload.contact && !payload.seo) {
      return NextResponse.json({ error: 'Provide hero, about, contact, or seo payload.' }, { status: 400 });
    }

    const updates: Prisma.SiteContentUpdateInput = {};

    if (payload.hero) {
      const parsedHero = heroSchema.partial().safeParse(payload.hero);
      if (!parsedHero.success) {
        return NextResponse.json({ error: 'Invalid hero payload' }, { status: 400 });
      }
      updates.hero = parsedHero.data as Prisma.InputJsonObject;
    }

    if (payload.about) {
      const parsedAbout = aboutSchema.partial({ highlights: true }).safeParse(payload.about);
      if (!parsedAbout.success) {
        return NextResponse.json({ error: 'Invalid about payload' }, { status: 400 });
      }
      updates.about = parsedAbout.data as Prisma.InputJsonObject;
    }

    if (payload.contact) {
      const parsedContact = contactSchema.partial({ socialLinks: true }).safeParse(payload.contact);
      if (!parsedContact.success) {
        return NextResponse.json({ error: 'Invalid contact payload' }, { status: 400 });
      }
      updates.contact = parsedContact.data as Prisma.InputJsonObject;
    }

    if (payload.seo) {
      const parsedSeo = seoSchema.partial({ keywords: true }).safeParse(payload.seo);
      if (!parsedSeo.success) {
        return NextResponse.json({ error: 'Invalid SEO payload' }, { status: 400 });
      }
      updates.seo = parsedSeo.data as Prisma.InputJsonObject;
    }

    const result = await prisma.siteContent.update({ where: { id: 1 }, data: updates });
    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to update site content', error);
    return NextResponse.json({ error: 'Unable to update site content' }, { status: 500 });
  }
}

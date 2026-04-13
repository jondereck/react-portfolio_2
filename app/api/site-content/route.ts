import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { aboutSchema, heroSchema, contactSchema, seoSchema } from '@/lib/validators';
import { isRateLimited } from '@/lib/server/rate-limit';
import { resolveManagedProfileFromRequest, resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';
import { ensureSiteContentForProfile } from '@/lib/profile/site-data';

type UpdateRequestPayload = {
  hero?: Record<string, unknown>;
  about?: Record<string, unknown>;
  contact?: Record<string, unknown>;
  seo?: Record<string, unknown>;
};

export async function GET(request: Request) {
  const access = await resolvePublicProfileFromRequest(request);
  if (!access || (!access.profile.isPublic && !access.canViewDrafts)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await ensureSiteContentForProfile(access.profile.id);
  const siteContent = await prisma.siteContent.findUnique({ where: { profileId: access.profile.id } });
  return NextResponse.json(siteContent);
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const { actor, profile } = await resolveManagedProfileFromRequest(request).catch(() => ({ actor: null, profile: null }));
  if (!actor || !profile) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canMutateContent(actor.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    await ensureSiteContentForProfile(profile.id);
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

    const result = await prisma.siteContent.update({ where: { profileId: profile.id }, data: updates });
    return NextResponse.json(result);
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    console.error('Failed to update site content', error);
    return NextResponse.json({ error: 'Unable to update site content' }, { status: 500 });
  }
}

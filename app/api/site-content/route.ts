import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { aboutSchema, heroSchema, contactSchema, seoSchema } from '@/lib/validators';
import { isRateLimited } from '@/lib/server/rate-limit';
import { resolveManagedProfileFromRequest, resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';
import { ensureSiteContentForProfile } from '@/lib/profile/site-data';
import { createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

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
    return createFormErrorResponse({ error: 'Too many requests. Try again later.', errorCode: 'RATE_LIMITED' }, 429);
  }

  const { actor, profile } = await resolveManagedProfileFromRequest(request).catch(() => ({ actor: null, profile: null }));
  if (!actor || !profile) {
    return createFormErrorResponse({ error: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }, 401);
  }
  if (!canMutateContent(actor.user.role)) {
    return createFormErrorResponse({ error: 'Forbidden', errorCode: 'FORBIDDEN' }, 403);
  }

  try {
    await ensureSiteContentForProfile(profile.id);
    const payload = (await request.json()) as UpdateRequestPayload;
    if (!payload.hero && !payload.about && !payload.contact && !payload.seo) {
      return createFormErrorResponse(
        {
          error: 'Provide hero, about, contact, or seo content to update.',
          errorCode: 'EMPTY_SITE_CONTENT_UPDATE',
        },
        400,
      );
    }

    const updates: Prisma.SiteContentUpdateInput = {};

    if (payload.hero) {
      const parsedHero = heroSchema.partial().safeParse(payload.hero);
      if (!parsedHero.success) {
        return createZodFormErrorResponse(parsedHero.error, { prefix: 'hero', errorCode: 'INVALID_SITE_CONTENT_PAYLOAD' });
      }
      updates.hero = parsedHero.data as Prisma.InputJsonObject;
    }

    if (payload.about) {
      const parsedAbout = aboutSchema.partial({ highlights: true }).safeParse(payload.about);
      if (!parsedAbout.success) {
        return createZodFormErrorResponse(parsedAbout.error, { prefix: 'about', errorCode: 'INVALID_SITE_CONTENT_PAYLOAD' });
      }
      updates.about = parsedAbout.data as Prisma.InputJsonObject;
    }

    if (payload.contact) {
      const parsedContact = contactSchema.partial({ socialLinks: true }).safeParse(payload.contact);
      if (!parsedContact.success) {
        return createZodFormErrorResponse(parsedContact.error, { prefix: 'contact', errorCode: 'INVALID_SITE_CONTENT_PAYLOAD' });
      }
      updates.contact = parsedContact.data as Prisma.InputJsonObject;
    }

    if (payload.seo) {
      const parsedSeo = seoSchema.partial({ keywords: true }).safeParse(payload.seo);
      if (!parsedSeo.success) {
        return createZodFormErrorResponse(parsedSeo.error, { prefix: 'seo', errorCode: 'INVALID_SITE_CONTENT_PAYLOAD' });
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
    if (error instanceof SyntaxError) {
      return createFormErrorResponse({ error: 'Malformed JSON request body.', errorCode: 'MALFORMED_JSON' }, 400);
    }
    return createFormErrorResponse({ error: 'Unable to update site content.', errorCode: 'SITE_CONTENT_UPDATE_FAILED' }, 500);
  }
}

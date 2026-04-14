import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { defaultSiteConfig } from '@/lib/siteContentDefaults';
import { isRateLimited } from '@/lib/server/rate-limit';
import { siteConfigSchema } from '@/lib/validators';
import { logAdminAuditEvent } from '@/lib/server/admin-settings';
import { resolveManagedProfileFromRequest, resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';
import { ensureSiteConfigForProfile } from '@/lib/profile/site-data';
import { createFormErrorResponse, createZodFormErrorResponse } from '@/lib/server/form-responses';

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

export async function GET(request: Request) {
  const access = await resolvePublicProfileFromRequest(request);
  const profile = access?.profile ?? null;
  if (!profile) {
    return NextResponse.json(defaultSiteConfig);
  }

  await ensureSiteConfigForProfile(profile.id);
  const config = await prisma.siteConfig.findUnique({ where: { profileId: profile.id } });
  return NextResponse.json(normalizeSiteConfig(config));
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
    const body = await request.json();
    const payload = extractConfigPayload(body);
    if (!payload) {
      return createFormErrorResponse(
        {
          error: 'Provide at least one site configuration field.',
          errorCode: 'EMPTY_SITE_CONFIG_UPDATE',
        },
        400,
      );
    }

    const parsed = siteConfigSchema.partial().safeParse({
      logoText: typeof payload.logoText === 'string' ? payload.logoText.trim() : payload.logoText,
      logoImage: typeof payload.logoImage === 'string' ? payload.logoImage.trim() : payload.logoImage,
      navigation: payload.navigation,
    });

    if (!parsed.success) {
      return createZodFormErrorResponse(parsed.error, { errorCode: 'INVALID_SITE_CONFIG_PAYLOAD' });
    }

    if (!parsed.data.logoText && !parsed.data.logoImage && !parsed.data.navigation) {
      return createFormErrorResponse(
        {
          error: 'Provide at least one site configuration field.',
          errorCode: 'EMPTY_SITE_CONFIG_UPDATE',
        },
        400,
      );
    }

    const current = await prisma.siteConfig.findUnique({ where: { profileId: profile.id } });
    const normalizedCurrent = normalizeSiteConfig(current);
    const updated = await prisma.siteConfig.upsert({
      where: { profileId: profile.id },
      update: {
        logoText: parsed.data.logoText ?? normalizedCurrent.logoText ?? null,
        logoImage: parsed.data.logoImage ?? normalizedCurrent.logoImage ?? null,
        navigation: parsed.data.navigation ?? normalizedCurrent.navigation ?? defaultSiteConfig.navigation,
      },
      create: {
        profileId: profile.id,
        logoText: parsed.data.logoText ?? normalizedCurrent.logoText ?? defaultSiteConfig.logoText,
        logoImage: parsed.data.logoImage ?? normalizedCurrent.logoImage ?? null,
        navigation: parsed.data.navigation ?? normalizedCurrent.navigation ?? defaultSiteConfig.navigation,
      },
    });

    await logAdminAuditEvent({
      actorUserId: actor.user.id,
      targetProfileId: profile.id,
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
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    console.error('Failed to update site config', error);
    if (error instanceof SyntaxError) {
      return createFormErrorResponse({ error: 'Malformed JSON request body.', errorCode: 'MALFORMED_JSON' }, 400);
    }
    return createFormErrorResponse({ error: 'Unable to update site configuration.', errorCode: 'SITE_CONFIG_UPDATE_FAILED' }, 500);
  }
}

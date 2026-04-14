import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { experienceSchema } from '@/lib/validators';
import { isRateLimited } from '@/lib/server/rate-limit';
import { resolveManagedProfileFromRequest, resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';
import { toErrorResponse } from '@/lib/server/api-responses';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function GET(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const access = await resolvePublicProfileFromRequest(request);
  if (!access || (!access.profile.isPublic && !access.canViewDrafts)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const experience = await prisma.experience.findFirst({
    where: {
      id,
      profileId: access.profile.id,
      ...(access.canViewDrafts ? {} : { isPublished: true }),
    },
  });

  if (!experience) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(experience);
}

export async function PUT(request: Request, context: RouteContext) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const { actor, profile } = await resolveManagedProfileFromRequest(request, payload);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const existing = await prisma.experience.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const parsed = experienceSchema.safeParse(payload);
    if (!parsed.success) {
      return toErrorResponse(parsed.error, 'Invalid experience payload.');
    }

    const updated = await prisma.experience.update({
      where: { id },
      data: {
        title: parsed.data.title,
        company: parsed.data.company,
        description: parsed.data.description,
        location: parsed.data.location ?? null,
        employmentType: parsed.data.employmentType ?? null,
        image: parsed.data.image ?? null,
        isCurrent: parsed.data.isCurrent ?? false,
        sortOrder: parsed.data.sortOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
        startDate: new Date(parsed.data.startDate),
        endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return NextResponse.json({ error: 'Unable to update experience' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canDeleteContent, canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { skillSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { isRateLimited } from '@/lib/server/rate-limit';
import { resolveManagedProfileFromRequest, resolvePublicProfileFromRequest } from '@/lib/profile/resolve-profile';

const buildSkillInput = async (data: Record<string, unknown>, imageFile?: File) => {
  const image =
    imageFile ? await uploadImageFile(imageFile, 'portfolio/skills') : typeof data.image === 'string' ? data.image : undefined;

  return skillSchema.parse({
    ...data,
    image,
  });
};

export async function GET(request: Request) {
  const access = await resolvePublicProfileFromRequest(request);
  if (!access || (!access.profile.isPublic && !access.canViewDrafts)) {
    return NextResponse.json([]);
  }

  const skills = await prisma.skill.findMany({
    where: {
      profileId: access.profile.id,
      ...(access.canViewDrafts ? {} : { isPublished: true }),
    },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(skills);
}

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const { actor, profile } = await resolveManagedProfileFromRequest(request, data);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const parsed = await buildSkillInput(data, imageFile);

    const created = await prisma.skill.create({
      data: {
        profileId: profile.id,
        name: parsed.name,
        level: parsed.level,
        category: parsed.category,
        description: parsed.description ?? null,
        image: parsed.image ?? null,
        sortOrder: parsed.sortOrder ?? 0,
        isPublished: parsed.isPublished ?? true,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to create skill.');
  }
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const { actor, profile } = await resolveManagedProfileFromRequest(request, data);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const id = Number(data?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const existing = await prisma.skill.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const parsed = await buildSkillInput(data, imageFile);

    const updated = await prisma.skill.update({
      where: { id },
      data: {
        name: parsed.name,
        level: parsed.level,
        category: parsed.category,
        description: parsed.description ?? null,
        image: parsed.image ?? null,
        sortOrder: parsed.sortOrder ?? 0,
        isPublished: parsed.isPublished ?? true,
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to update skill.');
  }
}

export async function DELETE(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const payload = await request.json();
    const { actor, profile } = await resolveManagedProfileFromRequest(request, payload);
    if (!canDeleteContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const id = Number(payload?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }
    const existing = await prisma.skill.findFirst({ where: { id, profileId: profile.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.skill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to delete skill.');
  }
}

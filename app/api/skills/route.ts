import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { skillSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { isRateLimited } from '@/lib/server/rate-limit';

const buildSkillInput = async (data: Record<string, unknown>, imageFile?: File) => {
  const image =
    imageFile ? await uploadImageFile(imageFile, 'portfolio/skills') : typeof data.image === 'string' ? data.image : undefined;

  return skillSchema.parse({
    ...data,
    image,
  });
};

export async function GET(request: Request) {
  const canViewDrafts = isAuthorizedMutation(request);
  const skills = await prisma.skill.findMany({
    where: canViewDrafts ? undefined : { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(skills);
}

export async function POST(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const parsed = await buildSkillInput(data, imageFile);

    const created = await prisma.skill.create({
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
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Unable to create skill.');
  }
}

export async function PUT(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const id = Number(data?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
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
    return toErrorResponse(error, 'Unable to update skill.');
  }
}

export async function DELETE(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const id = Number(payload?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await prisma.skill.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, 'Unable to delete skill.');
  }
}

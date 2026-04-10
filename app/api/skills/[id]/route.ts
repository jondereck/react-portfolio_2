import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { skillSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
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

  const canViewDrafts = isAuthorizedMutation(request);
  const skill = await prisma.skill.findUnique({ where: { id } });

  if (!skill || (!canViewDrafts && !skill.isPublished)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(skill);
}

export async function PUT(request: Request, context: RouteContext) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const image =
      imageFile ? await uploadImageFile(imageFile, 'portfolio/skills') : typeof data.image === 'string' ? data.image : undefined;
    const parsed = skillSchema.parse({
      ...data,
      image,
    });

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

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { skillSchema } from '@/lib/validators';

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
    const payload = await request.json();
    const parsed = skillSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await prisma.skill.update({
      where: { id },
      data: {
        name: parsed.data.name,
        level: parsed.data.level,
        category: parsed.data.category,
        description: parsed.data.description ?? null,
        image: parsed.data.image ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unable to update skill' }, { status: 500 });
  }
}

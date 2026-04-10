import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { experienceSchema } from '@/lib/validators';

const parseId = (rawId: string): number | null => {
  const id = Number(rawId);
  return Number.isInteger(id) && id > 0 ? id : null;
};

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const canViewDrafts = isAuthorizedMutation(request);
  const item = await prisma.experience.findFirst({
    where: canViewDrafts ? { id } : { id, isPublished: true },
  });

  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(item);
}

export async function PUT(request: Request, context: RouteContext) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id: rawId } = await context.params;
  const id = parseId(rawId);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  try {
    const payload = await request.json();
    const parsed = experienceSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
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
  } catch {
    return NextResponse.json({ error: 'Unable to update experience' }, { status: 500 });
  }
}

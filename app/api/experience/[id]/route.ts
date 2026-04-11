import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { experienceSchema } from '@/lib/validators';
import { isRateLimited } from '@/lib/server/rate-limit';

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
  const experience = await prisma.experience.findUnique({ where: { id } });

  if (!experience || (!canViewDrafts && !experience.isPublished)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(experience);
}

export async function PUT(request: Request, context: RouteContext) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

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

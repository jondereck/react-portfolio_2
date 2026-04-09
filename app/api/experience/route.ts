import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { experienceSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const canViewDrafts = isAuthorizedMutation(request);
  const experience = await prisma.experience.findMany({
    where: canViewDrafts ? undefined : { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(experience);
}

export async function POST(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = experienceSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const created = await prisma.experience.create({
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

    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create experience' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const id = Number(payload?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

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

export async function DELETE(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const id = Number(payload?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await prisma.experience.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to delete experience' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { portfolioSchema } from '@/lib/validators';

const normalizeTech = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export async function GET() {
  const projects = await prisma.portfolio.findMany({
    where: { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(projects);
}

export async function POST(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = portfolioSchema.safeParse({
      ...payload,
      slug: slugify(String(payload.slug || payload.title || '')),
      tech: normalizeTech(payload.tech),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const created = await prisma.portfolio.create({ data: parsed.data });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create project' }, { status: 500 });
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

    const parsed = portfolioSchema.safeParse({
      ...payload,
      slug: slugify(String(payload.slug || payload.title || '')),
      tech: normalizeTech(payload.tech),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await prisma.portfolio.update({ where: { id }, data: parsed.data });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unable to update project' }, { status: 500 });
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

    await prisma.portfolio.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to delete project' }, { status: 500 });
  }
}

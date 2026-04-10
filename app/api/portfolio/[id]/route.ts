import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { portfolioSchema } from '@/lib/validators';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

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

export async function GET(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const canViewDrafts = isAuthorizedMutation(request);
  const project = await prisma.portfolio.findUnique({ where: { id } });

  if (!project || (!canViewDrafts && !project.isPublished)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(project);
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
    const parsed = portfolioSchema.safeParse({
      ...payload,
      slug: slugify(String(payload.slug || payload.title || '')),
      tech: normalizeTech(payload.tech),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await prisma.portfolio.update({
      where: { id },
      data: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        description: parsed.data.description,
        tech: parsed.data.tech,
        link: parsed.data.link,
        image: parsed.data.image,
        badge: parsed.data.badge,
        repoUrl: parsed.data.repoUrl ?? null,
        demoUrl: parsed.data.demoUrl ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isFeatured: parsed.data.isFeatured ?? false,
        isPublished: parsed.data.isPublished ?? true,
      },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unable to update project' }, { status: 500 });
  }
}

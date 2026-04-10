import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { portfolioSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';

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

const normalizeDescriptions = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

const fallbackSummary = (data: Record<string, unknown>) => {
  if (typeof data.summary === 'string' && data.summary.trim()) {
    return data.summary;
  }
  if (typeof data.description === 'string' && data.description.trim()) {
    return data.description;
  }
  return '';
};

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const serializePortfolio = (project: Record<string, unknown>) => ({
  ...project,
  summary: typeof project.description === 'string' ? project.description : '',
  descriptions: normalizeDescriptions(project.descriptions),
  description: typeof project.description === 'string' ? project.description : '',
  tech: normalizeTech(project.tech),
});

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

  return NextResponse.json(serializePortfolio(project));
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
      imageFile ? await uploadImageFile(imageFile, 'portfolio/projects') : typeof data.image === 'string' ? data.image : undefined;
    const parsed = portfolioSchema.parse({
      ...data,
      summary: fallbackSummary(data),
      descriptions: normalizeDescriptions(data.descriptions),
      slug: slugify(String(data.slug || data.title || '')),
      tech: normalizeTech(data.tech),
      image,
    });

    const updateData: Record<string, unknown> = {
      title: parsed.title,
      slug: parsed.slug,
      description: parsed.summary,
      descriptions: parsed.descriptions.length > 0 ? parsed.descriptions : null,
      tech: parsed.tech,
      image: parsed.image,
      badge: parsed.badge,
      repoUrl: parsed.repoUrl ?? null,
      demoUrl: parsed.demoUrl ?? null,
      sortOrder: parsed.sortOrder ?? 0,
      isFeatured: parsed.isFeatured ?? false,
      isPublished: parsed.isPublished ?? true,
    };

    const updated = await prisma.portfolio.update({
      where: { id },
      data: updateData as never,
    });

    return NextResponse.json(serializePortfolio(updated));
  } catch (error) {
    return toErrorResponse(error, 'Unable to update portfolio entry.');
  }
}

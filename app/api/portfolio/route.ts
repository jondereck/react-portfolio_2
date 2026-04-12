import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { portfolioSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { isRateLimited } from '@/lib/server/rate-limit';

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

const buildPortfolioInput = async (data: Record<string, unknown>, imageFile?: File) => {
  const image =
    imageFile ? await uploadImageFile(imageFile, 'portfolio/projects') : typeof data.image === 'string' ? data.image : undefined;

  return portfolioSchema.parse({
    ...data,
    summary: fallbackSummary(data),
    descriptions: normalizeDescriptions(data.descriptions),
    slug: slugify(String(data.slug || data.title || '')),
    tech: normalizeTech(data.tech),
    image,
  });
};

const serializePortfolio = (project: Record<string, unknown>) => ({
  ...project,
  summary: typeof project.description === 'string' ? project.description : '',
  descriptions: normalizeDescriptions(project.descriptions),
  description: typeof project.description === 'string' ? project.description : '',
  tech: normalizeTech(project.tech),
});

export async function GET(request: Request) {
  const canViewDrafts = await isAuthorizedMutation(request);
  const projects = await prisma.portfolio.findMany({
    where: canViewDrafts ? undefined : { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(projects.map(serializePortfolio));
}

export async function POST(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const parsed = await buildPortfolioInput(data, imageFile);

    const createData: Record<string, unknown> = {
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

    const created = await prisma.portfolio.create({
      data: createData as never,
    });
    return NextResponse.json(serializePortfolio(created), { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Unable to create portfolio entry.');
  }
}

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const id = Number(data?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const parsed = await buildPortfolioInput(data, imageFile);

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

export async function DELETE(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!(await isAuthorizedMutation(request))) {
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
  } catch (error) {
    return toErrorResponse(error, 'Unable to delete portfolio entry.');
  }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { certificateSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { isRateLimited } from '@/lib/server/rate-limit';

type RouteContext = { params: Promise<{ id: string }> };

const parseId = (value: string) => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

const normalizeOptionalText = (value: unknown) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeCertificatePayload = (data: Record<string, unknown>) => ({
  title: typeof data.title === 'string' ? data.title.trim() : data.title,
  issuer: typeof data.issuer === 'string' ? data.issuer.trim() : data.issuer,
  image: typeof data.image === 'string' ? data.image.trim() : data.image,
  link: typeof data.link === 'string' ? data.link.trim() : data.link,
  category: typeof data.category === 'string' ? data.category.trim() : data.category,
  issuedAt: data.issuedAt === '' ? null : data.issuedAt,
  expiresAt: data.expiresAt === '' ? null : data.expiresAt,
  credentialId: normalizeOptionalText(data.credentialId),
  sortOrder: data.sortOrder,
  isPublished: data.isPublished,
});

export async function GET(request: Request, context: RouteContext) {
  const { id: idParam } = await context.params;
  const id = parseId(idParam);
  if (!id) {
    return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
  }

  const canViewDrafts = isAuthorizedMutation(request);
  const certificate = await prisma.certificate.findUnique({ where: { id } });

  if (!certificate || (!canViewDrafts && !certificate.isPublished)) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(certificate);
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
    const { data, imageFile } = await parseMultipartOrJson(request);
    const image =
      imageFile ? await uploadImageFile(imageFile, 'portfolio/certificates') : typeof data.image === 'string' ? data.image : undefined;
    const parsed = certificateSchema.parse({
      ...normalizeCertificatePayload(data),
      image,
    });

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        title: parsed.title,
        issuer: parsed.issuer,
        image: parsed.image,
        link: parsed.link,
        category: parsed.category,
        credentialId: parsed.credentialId ?? null,
        sortOrder: parsed.sortOrder ?? 0,
        isPublished: parsed.isPublished ?? true,
        issuedAt: parsed.issuedAt ? new Date(parsed.issuedAt) : null,
        expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return toErrorResponse(error, 'Unable to update certificate.');
  }
}

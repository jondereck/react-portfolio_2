import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { certificateSchema } from '@/lib/validators';
import { parseMultipartOrJson } from '@/lib/server/request-parsing';
import { uploadImageFile } from '@/lib/server/uploads';
import { toErrorResponse } from '@/lib/server/api-responses';
import { isRateLimited } from '@/lib/server/rate-limit';

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

const buildCertificateInput = async (data: Record<string, unknown>, imageFile?: File) => {
  const image =
    imageFile ? await uploadImageFile(imageFile, 'portfolio/certificates') : typeof data.image === 'string' ? data.image : undefined;

  const parsed = certificateSchema.parse({
    ...normalizeCertificatePayload(data),
    image,
  });

  return parsed;
};

export async function GET(request: Request) {
  const canViewDrafts = isAuthorizedMutation(request);
  const certificates = await prisma.certificate.findMany({
    where: canViewDrafts ? undefined : { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(certificates);
}

export async function POST(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const parsed = await buildCertificateInput(data, imageFile);

    const created = await prisma.certificate.create({
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
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return toErrorResponse(error, 'Unable to create certificate.');
  }
}

export async function PUT(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data, imageFile } = await parseMultipartOrJson(request);
    const id = Number(data?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const parsed = await buildCertificateInput(data, imageFile);

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

export async function DELETE(request: Request) {
  if (isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const id = Number(payload?.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    await prisma.certificate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return toErrorResponse(error, 'Unable to delete certificate.');
  }
}

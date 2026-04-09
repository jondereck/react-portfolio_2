import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { certificateSchema } from '@/lib/validators';

export async function GET(request: Request) {
  const canViewDrafts = isAuthorizedMutation(request);
  const certificates = await prisma.certificate.findMany({
    where: canViewDrafts ? undefined : { isPublished: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
  return NextResponse.json(certificates);
}

export async function POST(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const parsed = certificateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const created = await prisma.certificate.create({
      data: {
        title: parsed.data.title,
        issuer: parsed.data.issuer,
        image: parsed.data.image,
        link: parsed.data.link,
        category: parsed.data.category,
        credentialId: parsed.data.credentialId ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
        issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });
    return NextResponse.json(created, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create certificate' }, { status: 500 });
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

    const parsed = certificateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const updated = await prisma.certificate.update({
      where: { id },
      data: {
        title: parsed.data.title,
        issuer: parsed.data.issuer,
        image: parsed.data.image,
        link: parsed.data.link,
        category: parsed.data.category,
        credentialId: parsed.data.credentialId ?? null,
        sortOrder: parsed.data.sortOrder ?? 0,
        isPublished: parsed.data.isPublished ?? true,
        issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null,
        expiresAt: parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null,
      },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Unable to update certificate' }, { status: 500 });
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

    await prisma.certificate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to delete certificate' }, { status: 500 });
  }
}

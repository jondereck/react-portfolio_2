import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { canMutateContent } from '@/lib/auth/roles';
import { toAuthErrorResponse } from '@/lib/auth/responses';
import { resolveManagedProfileFromRequest } from '@/lib/profile/resolve-profile';
import { isRateLimited } from '@/lib/server/rate-limit';
import { toErrorResponse } from '@/lib/server/api-responses';
import { portfolioReorderSchema } from '@/lib/validators';

const normalizeIds = (value: unknown) =>
  Array.isArray(value)
    ? value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0)
    : [];

export async function PUT(request: Request) {
  if (await isRateLimited(request, 'admin-mutation', 120, 60_000)) {
    return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { actor, profile } = await resolveManagedProfileFromRequest(request, body);
    if (!canMutateContent(actor.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = portfolioReorderSchema.parse({
      featuredIds: normalizeIds(body?.featuredIds),
      regularIds: normalizeIds(body?.regularIds),
    });

    const nextIds = [...parsed.featuredIds, ...parsed.regularIds];
    const uniqueIds = new Set(nextIds);
    if (uniqueIds.size !== nextIds.length) {
      return NextResponse.json({ error: 'Duplicate project ids are not allowed.' }, { status: 400 });
    }

    const existing = await prisma.portfolio.findMany({
      where: { profileId: profile.id },
      select: { id: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const existingIds = existing.map((item) => item.id);

    if (existingIds.length !== nextIds.length) {
      return NextResponse.json({ error: 'Reorder payload must include every project exactly once.' }, { status: 400 });
    }

    const existingSet = new Set(existingIds);
    for (const id of nextIds) {
      if (!existingSet.has(id)) {
        return NextResponse.json({ error: 'Reorder payload contains an unknown project id.' }, { status: 400 });
      }
    }

    // Rewrite full ordering deterministically: featured first, then regular.
    await prisma.$transaction(async (tx) => {
      const updates: Array<ReturnType<typeof tx.portfolio.update>> = [];

      let order = 0;
      for (const id of parsed.featuredIds) {
        updates.push(
          tx.portfolio.update({
            where: { id },
            data: { isFeatured: true, sortOrder: order++ },
          }),
        );
      }
      for (const id of parsed.regularIds) {
        updates.push(
          tx.portfolio.update({
            where: { id },
            data: { isFeatured: false, sortOrder: order++ },
          }),
        );
      }

      await Promise.all(updates);
    });

    const updated = await prisma.portfolio.findMany({
      where: { profileId: profile.id },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });

    return NextResponse.json({ projects: updated });
  } catch (error) {
    const authError = toAuthErrorResponse(error);
    if (authError) {
      return authError;
    }
    return toErrorResponse(error, 'Unable to reorder projects.');
  }
}


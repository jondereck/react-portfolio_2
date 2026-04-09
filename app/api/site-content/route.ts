import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isAuthorizedMutation } from '@/lib/adminAuth';
import { aboutSchema, heroSchema } from '@/lib/validators';

export async function GET() {
  const siteContent = await prisma.siteContent.get();
  return NextResponse.json(siteContent);
}

export async function PUT(request: Request) {
  if (!isAuthorizedMutation(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    if (!payload.hero && !payload.about) {
      return NextResponse.json({ error: 'Provide hero or about payload.' }, { status: 400 });
    }

    const updates: { hero?: Record<string, unknown>; about?: Record<string, unknown> } = {};

    if (payload.hero) {
      const parsedHero = heroSchema.partial().safeParse(payload.hero);
      if (!parsedHero.success) {
        return NextResponse.json({ error: 'Invalid hero payload' }, { status: 400 });
      }
      updates.hero = parsedHero.data;
    }

    if (payload.about) {
      const parsedAbout = aboutSchema.partial({ highlights: true }).safeParse(payload.about);
      if (!parsedAbout.success) {
        return NextResponse.json({ error: 'Invalid about payload' }, { status: 400 });
      }
      updates.about = parsedAbout.data;
    }

    const result = await prisma.siteContent.update(updates);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: 'Unable to update site content' }, { status: 500 });
  }
}

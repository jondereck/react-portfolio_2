import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { formatZodError } from '@/lib/server/request-parsing';
import { RequestValidationError } from '@/lib/server/uploads';

export function toErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof RequestValidationError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Invalid payload.',
        details: formatZodError(error),
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'A record with the same unique field already exists.' }, { status: 409 });
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found.' }, { status: 404 });
    }
  }

  if (error instanceof Error && /body|payload|entity/i.test(error.message) && /large|too\s+big|too\s+large|exceeded/i.test(error.message)) {
    return NextResponse.json({ error: 'Request body is too large.' }, { status: 413 });
  }

  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

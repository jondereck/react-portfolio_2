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
        errorCode: error.errorCode,
        details: error.details,
        ...(error.meta ?? {}),
      },
      { status: error.status },
    );
  }

  if (error instanceof z.ZodError) {
    return NextResponse.json(
      {
        error: 'Invalid payload.',
        errorCode: 'INVALID_PAYLOAD',
        details: formatZodError(error),
      },
      { status: 400 },
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      const target = Array.isArray(error.meta?.target) ? error.meta.target.map(String) : [];
      if (target.includes('albumId') && target.includes('contentHash')) {
        return NextResponse.json(
          {
            error: 'Duplicate media already exists in this album.',
            errorCode: 'DUPLICATE_MEDIA',
          },
          { status: 409 },
        );
      }

      if (target.includes('albumId') && target.includes('sourceId')) {
        return NextResponse.json(
          {
            error: 'This Google Drive media already exists in the selected album.',
            errorCode: 'DUPLICATE_SOURCE_MEDIA',
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          error: 'A record with the same unique field already exists.',
          errorCode: 'UNIQUE_CONSTRAINT_VIOLATION',
        },
        { status: 409 },
      );
    }

    if (error.code === 'P2025') {
      return NextResponse.json({ error: 'Record not found.', errorCode: 'RECORD_NOT_FOUND' }, { status: 404 });
    }
  }

  if (error instanceof Error && /body|payload|entity/i.test(error.message) && /large|too\s+big|too\s+large|exceeded/i.test(error.message)) {
    return NextResponse.json({ error: 'Request body is too large.', errorCode: 'REQUEST_BODY_TOO_LARGE' }, { status: 413 });
  }

  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

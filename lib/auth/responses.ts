import { NextResponse } from 'next/server';
import { createFormErrorResponse } from '@/lib/server/form-responses';

export function toAuthErrorResponse(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHENTICATED') {
    return createFormErrorResponse({ error: 'Unauthorized', errorCode: 'UNAUTHENTICATED' }, 401);
  }

  if (error instanceof Error && error.message === 'FORBIDDEN') {
    return createFormErrorResponse({ error: 'Forbidden', errorCode: 'FORBIDDEN' }, 403);
  }

  return null;
}

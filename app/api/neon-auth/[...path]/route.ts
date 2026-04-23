import { NextResponse } from 'next/server';
import { getNeonAuth, getNeonAuthConfigError } from '@/lib/auth/neon-server';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function getHandlerResponse(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  request: Request,
  context: RouteContext,
) {
  const auth = getNeonAuth();
  if (!auth) {
    return NextResponse.json(
      { error: getNeonAuthConfigError() ?? 'Neon Auth is not configured.' },
      { status: 503 },
    );
  }

  const handler = auth.handler();
  return handler[method](request, context);
}

export function GET(request: Request, context: RouteContext) {
  return getHandlerResponse('GET', request, context);
}

export function POST(request: Request, context: RouteContext) {
  return getHandlerResponse('POST', request, context);
}

export function PUT(request: Request, context: RouteContext) {
  return getHandlerResponse('PUT', request, context);
}

export function DELETE(request: Request, context: RouteContext) {
  return getHandlerResponse('DELETE', request, context);
}

export function PATCH(request: Request, context: RouteContext) {
  return getHandlerResponse('PATCH', request, context);
}

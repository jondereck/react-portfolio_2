import { NextResponse } from 'next/server';
import { hasValidAdminSession } from '@/lib/server/admin-session';

export async function GET(request: Request) {
  if (!(await hasValidAdminSession(request))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}

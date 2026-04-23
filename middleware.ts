import { NextRequest, NextResponse } from 'next/server';
import { createNeonAuth } from '@neondatabase/auth/next/server';

const baseUrl = process.env.NEON_AUTH_BASE_URL;
const cookieSecret = process.env.NEON_AUTH_COOKIE_SECRET;

const neonAuth =
  baseUrl && cookieSecret
    ? createNeonAuth({
        baseUrl,
        cookies: {
          secret: cookieSecret,
        },
      })
    : null;

export default function middleware(request: NextRequest) {
  if (!neonAuth) {
    return NextResponse.next();
  }

  return neonAuth.middleware({
    loginUrl: '/admin/login',
  })(request);
}

export const config = {
  matcher: ['/admin/:path*', '/gallery/:path*'],
};

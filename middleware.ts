import { NextResponse, type NextRequest } from 'next/server';

const AUTH_COOKIE = process.env.DASHBOARD_COOKIE_NAME || 'mehor_admin_session';
const PUBLIC_FILE = /\.[^/]+$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow Next.js internals and public static files.
  if (
    pathname.startsWith('/_next') ||
    PUBLIC_FILE.test(pathname) ||
    pathname === '/favicon.ico' ||
    pathname === '/robots.txt' ||
    pathname === '/sitemap.xml'
  ) {
    return NextResponse.next();
  }

  const hasSession = req.cookies.has(AUTH_COOKIE);

  // Public route: sign-in
  if (pathname === '/sign-in') {
    return NextResponse.next();
  }

  // Everything else is private
  if (!hasSession) {
    const url = new URL('/sign-in', req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image).*)'],
};

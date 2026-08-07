import { NextResponse, type NextRequest } from "next/server";

const COOKIE = "store_session";

/**
 * Next 16 renamed middleware to proxy. This is an *optimistic* check only: it
 * bounces obviously-signed-out visitors away from /admin so they don't see a
 * flash of the panel. Real authorization lives in `requireStaff()`, which runs
 * in every admin page and Server Action — a cookie's mere presence proves
 * nothing, and Server Actions are reachable by direct POST.
 */
export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get(COOKIE)?.value);

  if (!hasSession) {
    const login = new URL("/admin/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  return NextResponse.next();
}

export const config = {
  // Everything under /admin except the login page itself.
  matcher: ["/admin/((?!login).*)", "/admin"],
};

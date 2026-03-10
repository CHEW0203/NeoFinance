import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./src/lib/auth/config";

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  const protectedPage =
    pathname.startsWith("/transactions") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications") ||
    pathname.startsWith("/calendar") ||
    pathname.startsWith("/scan") ||
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/report") ||
    pathname.startsWith("/streak");
  const protectedApi = pathname.startsWith("/api/transactions");

  if (!hasSessionCookie && protectedPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!hasSessionCookie && protectedApi) {
    return NextResponse.json(
      { message: "Unauthorized. Please login." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/transactions/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/calendar/:path*",
    "/scan/:path*",
    "/gallery/:path*",
    "/report/:path*",
    "/streak/:path*",
    "/api/transactions/:path*",
  ],
};

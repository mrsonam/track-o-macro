import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";
import {
  clearNextAuthCookies,
  hasNextAuthSessionCookie,
} from "@/lib/auth-cookies";

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (
    pathname === "/manifest.json" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/sw.js" ||
    pathname.startsWith("/_next") ||
    pathname.includes("/icon-")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/error")) {
    return NextResponse.next();
  }

  let token: Awaited<ReturnType<typeof getToken>> = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    token = null;
  }

  const staleSessionCookie = !token && hasNextAuthSessionCookie(request);

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  const isPublicInfoPage =
    pathname === "/" ||
    pathname === "/privacy" ||
    pathname.startsWith("/resources/");

  const isPublicApi =
    pathname.startsWith("/api/auth") ||
    pathname === "/api/register" ||
    pathname === "/api/health/apple/sync" ||
    pathname === "/api/internal/demo-daily-log";

  if (isPublicApi) {
    const res = NextResponse.next();
    if (staleSessionCookie) clearNextAuthCookies(res);
    return res;
  }

  if (!token && !isAuthPage && !isPublicInfoPage) {
    if (pathname.startsWith("/api")) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      if (staleSessionCookie) clearNextAuthCookies(res);
      return res;
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (staleSessionCookie) clearNextAuthCookies(res);
    return res;
  }

  if (token && (isAuthPage || pathname === "/")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const res = NextResponse.next();
  if (staleSessionCookie) clearNextAuthCookies(res);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

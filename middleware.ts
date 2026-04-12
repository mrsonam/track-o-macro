import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
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

  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");

  const isPublicInfoPage =
    pathname === "/privacy" || pathname.startsWith("/resources/");

  const isPublicApi =
    pathname.startsWith("/api/auth") || pathname === "/api/register";

  if (isPublicApi) {
    return NextResponse.next();
  }

  if (!token && !isAuthPage && !isPublicInfoPage) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (token && isAuthPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

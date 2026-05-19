import { NextResponse, type NextRequest } from "next/server";

/** Cookie names NextAuth may set for JWT sessions (dev + production). */
const NEXT_AUTH_COOKIE_NAMES = [
  "next-auth.session-token",
  "next-auth.callback-url",
  "next-auth.csrf-token",
  "__Secure-next-auth.session-token",
  "__Host-next-auth.csrf-token",
] as const;

export function hasNextAuthSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has("next-auth.session-token") ||
    request.cookies.has("__Secure-next-auth.session-token")
  );
}

/** Remove stale session cookies so the client stops sending undecryptable JWTs. */
export function clearNextAuthCookies(response: NextResponse): void {
  for (const name of NEXT_AUTH_COOKIE_NAMES) {
    response.cookies.delete(name);
  }
}

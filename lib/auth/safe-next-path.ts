const ALLOWED_PATHS = new Set([
  "/dashboard",
  "/log",
  "/onboarding",
  "/settings",
  "/trends",
  "/prepared-meals",
]);

/** Restrict post-login redirects to same-origin app routes. */
export function getSafeNextPath(
  raw: string | null | undefined,
  fallback = "/dashboard",
): string {
  if (!raw) return fallback;
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return fallback;
  }

  const pathname = raw.split(/[?#]/)[0] ?? raw;
  if (ALLOWED_PATHS.has(pathname)) return raw;

  for (const base of ALLOWED_PATHS) {
    if (pathname.startsWith(`${base}/`)) return raw;
  }

  return fallback;
}

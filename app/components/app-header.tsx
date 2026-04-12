"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";

export function AppHeader() {
  const router = useRouter();
  const pathname = usePathname();

  async function onSignOut() {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200/70 bg-white/75 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 font-semibold tracking-tight text-stone-900 transition-opacity hover:opacity-90"
          aria-label="Calorie Agent home"
        >
          <span
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-[11px] font-bold tracking-tight text-white shadow-md shadow-emerald-900/20"
            aria-hidden
          >
            CA
          </span>
          <span className="text-[15px] font-semibold sm:text-base">
            Calorie Agent
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm" aria-label="Main">
          <Link
            href="/"
            aria-current={pathname === "/" ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              pathname === "/"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            Log
          </Link>
          <Link
            href="/history"
            aria-current={pathname === "/history" ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              pathname === "/history"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            History
          </Link>
          <Link
            href="/settings"
            aria-current={pathname === "/settings" ? "page" : undefined}
            className={`rounded-lg px-3 py-1.5 font-medium transition-colors ${
              pathname === "/settings"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
            }`}
          >
            Settings
          </Link>
          <Link
            href="/privacy"
            aria-current={pathname === "/privacy" ? "page" : undefined}
            className={`hidden rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:inline-flex ${
              pathname === "/privacy"
                ? "bg-stone-100 text-stone-900"
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
            }`}
          >
            Privacy
          </Link>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="ml-1 rounded-lg px-3 py-1.5 font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800"
          >
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}

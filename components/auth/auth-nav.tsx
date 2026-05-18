import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

export type AuthNavVariant = "login" | "signup";

type AuthNavProps = {
  variant: AuthNavVariant;
};

/** Top bar for sign-in and sign-up — matches landing header chrome. */
export function AuthNav({ variant }: AuthNavProps) {
  return (
    <header className="auth-nav w-full shrink-0 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-6">
      <div className="landing-header-bar mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="focus-ring flex min-w-0 items-center gap-2 rounded-xl transition-opacity duration-200 hover:opacity-80"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-[color:var(--protein-tint)] shadow-[0_12px_28px_-18px_rgba(23,20,18,0.8)]">
            <Activity className="h-5 w-5" aria-hidden />
          </div>
          <span className="truncate text-base font-black tracking-tight text-[color:var(--foreground)] sm:text-lg">
            TrackOMacro
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-2 sm:gap-3" aria-label="Account">
          {variant === "login" ? (
            <Link
              href="/signup"
              className="btn-primary focus-ring tap-target gap-2 px-4 text-sm"
            >
              Create account
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <Link
              href="/login"
              className="focus-ring tap-target rounded-xl px-3 text-sm font-bold text-zinc-600 transition-colors duration-200 hover:text-[color:var(--foreground)]"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

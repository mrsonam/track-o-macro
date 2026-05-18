import Link from "next/link";
import { Activity } from "lucide-react";

type OnboardingHeaderProps = {
  onSignOut: () => void;
  saving?: boolean;
};

export function OnboardingHeader({ onSignOut, saving }: OnboardingHeaderProps) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
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
      <button
        type="button"
        onClick={onSignOut}
        disabled={saving}
        className="focus-ring tap-target shrink-0 rounded-xl px-3 text-xs font-bold uppercase tracking-wider text-zinc-500 transition-colors duration-200 hover:text-[color:var(--foreground)] disabled:opacity-50"
      >
        Sign out
      </button>
    </header>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Compass } from "lucide-react";
import { dash } from "@/lib/ui/dashboard-tokens";

export const metadata: Metadata = {
  title: "Page not found · TrackOMacro",
  description: "The page you're looking for doesn't exist, may have moved, or the link might be broken.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-black/10 bg-warm-neutral text-zinc-600">
        <Compass className="h-7 w-7" aria-hidden />
      </div>
      <p className={dash.labelEyebrow}>404 error</p>
      <h1 className="mt-3 font-mono text-4xl font-black tracking-tight text-foreground sm:text-5xl">
        Page not found
      </h1>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-zinc-600">
        The page you are looking for does not exist, may have moved, or the link might be broken.
      </p>

      <div className="mt-8 flex flex-col items-center gap-4">
        <Link href="/" className="btn-primary px-8 py-3.5 text-sm">
          Back home
        </Link>
        <Link
          href="/login"
          className="focus-ring tap-target rounded-xl px-3 text-xs font-bold uppercase tracking-widest text-zinc-500 transition-colors hover:text-foreground"
        >
          Sign in instead
        </Link>
      </div>
    </div>
  );
}

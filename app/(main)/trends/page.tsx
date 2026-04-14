import { Suspense } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { TrendsPageBody } from "@/app/components/trends/trends-page-body";
import { TrendsPageSkeleton } from "@/app/components/skeletons/trends-page-skeleton";

export default function TrendsPage() {
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <header className="mb-12 flex flex-col gap-8 lg:mb-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-5 sm:gap-6">
            <div className="group relative">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 opacity-25 blur transition duration-1000 group-hover:opacity-40" />
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 text-emerald-400 shadow-2xl">
                <BarChart3 className="h-7 w-7" strokeWidth={2} aria-hidden />
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
                  Analytics Engine
                </p>
                <div className="flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500">
                  <Sparkles className="h-2 w-2" />
                  Live
                </div>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Trends & Patterns
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-500 sm:text-[17px]">
                Rolling windows, weekly recap, and calendar months — all aligned to
                your local dates. Use this space to scan patterns and optimize your
                metabolic health.
              </p>
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<TrendsPageSkeleton />}>
        <TrendsPageBody />
      </Suspense>
    </div>
  );
}

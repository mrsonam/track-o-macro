import { Suspense } from "react";
import { BarChart3, Sparkles } from "lucide-react";
import { TrendsPageBody } from "@/app/components/trends/trends-page-body";
import { TrendsPageSkeleton } from "@/app/components/skeletons/trends-page-skeleton";

export default function TrendsPage() {
  return (
    <div className="flex min-h-screen flex-col pb-20">
      <header className="mb-12 flex flex-col gap-8 lg:mb-14">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 items-start gap-5 sm:gap-6">
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white text-[#4f9d45] shadow-[0_12px_30px_-22px_rgba(23,20,18,0.6)]">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#4f9d45]/10 via-transparent to-[#dff1ff]/50" />
              <div className="relative">
                <BarChart3 className="h-7 w-7" strokeWidth={2} aria-hidden />
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
                  Analytics Engine
                </p>
                <div className="flex items-center gap-1 rounded-full border border-[#4f9d45]/20 bg-[#eaf7df] px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-[#4f9d45]">
                  <Sparkles className="h-2 w-2" />
                  Live
                </div>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
                Trends & Patterns
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-[17px]">
                Use rolling windows, weekly recap, and monthly history to spot intake
                drift early and make small corrections while momentum is high.
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

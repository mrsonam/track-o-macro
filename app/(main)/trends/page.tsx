import { Suspense } from "react";
import { PageHeaderReveal } from "@/app/components/motion/page-header-reveal";
import { TrendsPageBody } from "@/app/components/trends/trends-page-body";
import { TrendsPageSkeleton } from "@/app/components/skeletons/trends-page-skeleton";
import { dash } from "@/lib/ui/dashboard-tokens";

export default function TrendsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PageHeaderReveal className="mb-8 flex flex-col gap-4 lg:mb-10">
        <div className="min-w-0">
          <p className={dash.labelEyebrow}>Analytics</p>
          <h1 className="font-mono text-3xl font-black tracking-tight text-foreground sm:text-4xl">
            Trends & patterns
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-[17px]">
            Rolling windows, weekly recap, and monthly history help you spot intake drift early and
            make small corrections while momentum is high.
          </p>
        </div>
      </PageHeaderReveal>

      <Suspense fallback={<TrendsPageSkeleton />}>
        <TrendsPageBody />
      </Suspense>
    </div>
  );
}

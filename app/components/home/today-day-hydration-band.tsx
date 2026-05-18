"use client";

import Link from "next/link";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { formatFluidCompact } from "@/lib/hydration/format-fluid-compact";
import { logHrefForDateKey } from "@/lib/meals/log-href";
import type { UnitSystem } from "@/lib/profile/units";
import { Droplets } from "lucide-react";
import { dash } from "@/lib/ui/dashboard-tokens";

type Props = {
  selectedDateKey: string;
  summary: MealDaySummary;
  dailyTargetHydrationMl: number;
  unitSystem: UnitSystem;
};

export function TodayDayHydrationBand({
  selectedDateKey,
  summary,
  dailyTargetHydrationMl,
  unitSystem,
}: Props) {
  const logHref = logHrefForDateKey(selectedDateKey);
  const hydrationMl = summary.hydrationTotalMl ?? 0;
  const hydrationGoal =
    dailyTargetHydrationMl > 0 ? dailyTargetHydrationMl : 2000;
  const hydrationPct =
    hydrationGoal > 0
      ? Math.min(100, Math.round((hydrationMl / hydrationGoal) * 100))
      : 0;

  return (
    <section
      className="rounded-3xl border border-sky-500/20 bg-carb-sky/55 p-4"
      aria-label="Hydration for this day"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/15 text-sky-700 ring-1 ring-sky-500/20">
            <Droplets className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-900/80">
              Hydration
            </p>
            <p className={`mt-0.5 text-lg ${dash.monoData}`}>
              {formatFluidCompact(hydrationMl, unitSystem)}
              <span className="text-xs font-bold text-zinc-600">
                {" "}
                of {formatFluidCompact(hydrationGoal, unitSystem)}
              </span>
            </p>
          </div>
        </div>
        <p className="shrink-0 font-mono text-2xl font-black tabular-nums text-sky-800">
          {hydrationPct}%
        </p>
      </div>

      <div
        className="mt-3 h-2 w-full overflow-hidden rounded-full border border-black/10 bg-white/70"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hydrationPct}
        aria-label="Progress toward fluid goal"
      >
        <div
          className="h-full rounded-full bg-sky-600"
          style={{ width: `${hydrationPct}%` }}
        />
      </div>

      <Link
        href={logHref}
        className="focus-ring tap-target mt-3 inline-flex min-h-[44px] cursor-pointer items-center text-xs font-bold text-sky-900 underline decoration-sky-600/35 underline-offset-4 transition-colors duration-200 hover:text-foreground"
      >
        Log water on the meal logger
      </Link>
    </section>
  );
}

"use client";

import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { MotionBento } from "@/lib/motion";
import { Clock } from "lucide-react";
import { dash } from "@/lib/ui/dashboard-tokens";

type Timing = NonNullable<MealDaySummary["timing"]>;

const BANDS: {
  key: keyof Omit<Timing, "total_kcal">;
  label: string;
  barClass: string;
}[] = [
  { key: "morning_kcal", label: "Morning", barClass: "bg-accent-secondary" },
  { key: "midday_kcal", label: "Midday", barClass: "bg-[#6b9d62]" },
  { key: "evening_kcal", label: "Evening", barClass: "bg-zinc-500" },
  { key: "late_night_kcal", label: "Late", barClass: "bg-zinc-400" },
];

type Props = {
  timing: Timing;
};

export function TodayDayTimingCard({ timing }: Props) {
  const total = timing.total_kcal > 0 ? timing.total_kcal : 1;
  const distributionLabel = BANDS.map((band) => {
    const kcal = Math.round(timing[band.key]);
    const pct =
      timing.total_kcal > 0
        ? Math.round((timing[band.key] / timing.total_kcal) * 100)
        : 0;
    return `${band.label} ${kcal} kcal (${pct}%)`;
  }).join(", ");

  return (
    <MotionBento index={1} className="bento-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-warm-neutral text-zinc-600">
          <Clock className="h-4 w-4" aria-hidden />
        </div>
        <h3 className={dash.labelSection}>By time of day</h3>
      </div>

      <div
        className="mb-4 flex h-2.5 w-full overflow-hidden rounded-full bg-black/10"
        role="img"
        aria-label={`Calorie distribution: ${distributionLabel}`}
      >
        {BANDS.map((band) => {
          const kcal = timing[band.key];
          const pct = Math.max(0, (kcal / total) * 100);
          if (pct < 0.5) return null;
          return (
            <div
              key={band.key}
              className={`h-full ${band.barClass}`}
              style={{ width: `${pct}%` }}
            />
          );
        })}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        {BANDS.map((band) => {
          const kcal = Math.round(timing[band.key]);
          const pct =
            timing.total_kcal > 0
              ? Math.round((timing[band.key] / timing.total_kcal) * 100)
              : 0;
          return (
            <div key={band.key}>
              <dt className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
                {band.label}
              </dt>
              <dd className={`text-sm ${dash.monoData}`}>
                {kcal}
                <span className="text-[10px] font-bold text-zinc-500"> kcal</span>
                <span className="ml-1 text-[10px] font-medium text-zinc-600">
                  ({pct}%)
                </span>
              </dd>
            </div>
          );
        })}
      </dl>
    </MotionBento>
  );
}

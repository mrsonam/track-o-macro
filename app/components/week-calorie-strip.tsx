"use client";

import {
  formatLocalYmd,
  parseLocalYmd,
} from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";

type WeekCalorieStripProps = {
  dateKeys: string[];
  selectedDateKey: string;
  onSelectDateKey: (ymd: string) => void;
  dailyTargetKcal: number | null;
  summariesByKey: Record<string, MealDaySummary | null | undefined>;
  batchLoading: boolean;
};

export function WeekCalorieStrip({
  dateKeys,
  selectedDateKey,
  onSelectDateKey,
  dailyTargetKcal,
  summariesByKey,
  batchLoading,
}: WeekCalorieStripProps) {
  const todayKey = formatLocalYmd(new Date());

  return (
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Last 7 days
      </p>
      <div
        className="mt-2 flex gap-1.5 overflow-x-auto pb-1 sm:gap-2"
        role="tablist"
        aria-label="Daily calories last 7 days"
      >
        {dateKeys.map((key) => {
          const d = parseLocalYmd(key);
          const isToday = key === todayKey;
          const selected = key === selectedDateKey;
          const summary = summariesByKey[key];
          const loading = batchLoading || summary === undefined;
          const kcalDisplay = loading
            ? "…"
            : summary
              ? String(Math.round(summary.totals.kcal))
              : "—";

          const kcalVal = summary?.totals.kcal ?? 0;
          const targetRatio =
            dailyTargetKcal != null &&
            dailyTargetKcal > 0 &&
            summary &&
            kcalVal > 0
              ? Math.min(1, kcalVal / dailyTargetKcal)
              : null;

          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectDateKey(key)}
              className={`flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-xl border px-2 py-2 text-center transition-colors sm:min-w-[3.75rem] sm:px-2.5 ${
                selected
                  ? "border-emerald-500 bg-emerald-50/90 ring-2 ring-emerald-500/25"
                  : "border-stone-200/90 bg-white/70 hover:bg-stone-50"
              } ${isToday && !selected ? "ring-1 ring-emerald-300/60" : ""}`}
            >
              <span className="text-[10px] font-medium uppercase leading-tight text-stone-500">
                {Number.isNaN(d.getTime())
                  ? "—"
                  : d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className="mt-0.5 text-sm font-semibold tabular-nums text-stone-900">
                {Number.isNaN(d.getTime()) ? "—" : d.getDate()}
              </span>
              <span className="mt-1 text-[11px] font-semibold tabular-nums text-emerald-800">
                {kcalDisplay}
              </span>
              {targetRatio != null ? (
                <span
                  className="mt-1 h-1 w-full overflow-hidden rounded-full bg-stone-200/90"
                  aria-hidden
                >
                  <span
                    className="block h-full rounded-full bg-emerald-500/90"
                    style={{ width: `${Math.round(targetRatio * 100)}%` }}
                  />
                </span>
              ) : (
                <span className="mt-1 h-1 w-full" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

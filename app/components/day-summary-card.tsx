"use client";

import { dayHeadingLabel } from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";

type DaySummaryCardProps = {
  dateKey: string;
  dailyTargetKcal: number | null;
  /** Optional daily protein target (g) from profile */
  dailyTargetProteinG?: number | null;
  loading: boolean;
  batchError: string | null;
  /** `undefined` while batch in flight; `null` if that day failed; else row data. */
  summary: MealDaySummary | null | undefined;
};

export function DaySummaryCard({
  dateKey,
  dailyTargetKcal,
  dailyTargetProteinG = null,
  loading,
  batchError,
  summary,
}: DaySummaryCardProps) {
  const heading = dayHeadingLabel(dateKey);
  const showSpinner = loading || summary === undefined;

  const logged = summary?.totals.kcal ?? 0;
  const target = dailyTargetKcal;
  const ratio =
    summary &&
    target != null &&
    target > 0
      ? Math.min(1, logged / target)
      : null;

  const proteinLogged = summary?.totals.protein_g ?? 0;
  const proteinTarget =
    dailyTargetProteinG != null && dailyTargetProteinG > 0
      ? dailyTargetProteinG
      : null;
  const proteinRatio =
    summary && proteinTarget != null
      ? Math.min(1, proteinLogged / proteinTarget)
      : null;

  return (
    <div className="mt-3 rounded-2xl border border-stone-200/90 bg-white/80 px-4 py-3 shadow-sm shadow-stone-900/5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
          {heading}
        </p>
        {showSpinner ? (
          <span className="text-xs text-stone-400">Loading…</span>
        ) : null}
      </div>
      {batchError ? (
        <p className="mt-1 text-xs text-red-700">{batchError}</p>
      ) : !showSpinner && summary === null ? (
        <p className="mt-1 text-xs text-red-700">
          Could not load this day.
        </p>
      ) : !showSpinner && summary ? (
        <>
          <p className="mt-1 text-lg font-semibold tabular-nums text-stone-900">
            {Math.round(logged)}{" "}
            <span className="text-sm font-medium text-stone-500">kcal</span>
            {target != null ? (
              <span className="text-sm font-normal text-stone-500">
                {" "}
                · goal ~{Math.round(target)} kcal
              </span>
            ) : null}
          </p>
          {summary.mealCount === 0 ? (
            <p className="mt-1 text-xs text-stone-500">Nothing logged this day.</p>
          ) : (
            <p className="mt-1 text-xs text-stone-500">
              {summary.mealCount} meal{summary.mealCount === 1 ? "" : "s"} · P{" "}
              {Math.round(summary.totals.protein_g)}g
              {proteinTarget != null ? (
                <>
                  {" "}
                  <span className="text-stone-400">
                    (goal ~{Math.round(proteinTarget)}g)
                  </span>
                </>
              ) : null}{" "}
              · C {Math.round(summary.totals.carbs_g)}g · F{" "}
              {Math.round(summary.totals.fat_g)}g
            </p>
          )}
          {summary.mealCount === 0 && proteinTarget != null ? (
            <p className="mt-1 text-xs text-stone-500">
              Protein goal for the day: ~{Math.round(proteinTarget)}g
            </p>
          ) : null}
          {ratio != null ? (
            <div
              className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200/90"
              role="progressbar"
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress toward daily calorie goal"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 transition-[width] duration-300"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
          ) : null}
          {proteinRatio != null ? (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-medium text-teal-900/80">
                Protein toward goal
              </p>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-stone-200/90"
                role="progressbar"
                aria-valuenow={Math.round(proteinRatio * 100)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progress toward daily protein goal"
              >
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-600 transition-[width] duration-300"
                style={{ width: `${Math.round(proteinRatio * 100)}%` }}
              />
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

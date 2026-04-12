"use client";

import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import {
  RollingWeekSummaryBody,
  type RollingWeekSummaryData,
} from "./rolling-week-summary-body";

export type WeekInsightPayload = RollingWeekSummaryData;

type WeekInsightsCardProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG?: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  loading: boolean;
  batchError: string | null;
  data: WeekInsightPayload | null;
};

export function WeekInsightsCard({
  dailyTargetKcal,
  dailyTargetProteinG = null,
  weeklyCoachingFocus = null,
  loading,
  batchError,
  data,
}: WeekInsightsCardProps) {
  return (
    <div className="mt-3 rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white/95 to-emerald-50/40 px-4 py-3 shadow-sm shadow-stone-900/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        This week
      </p>
      {loading ? (
        <p className="mt-2 text-xs text-stone-400">Loading…</p>
      ) : batchError ? (
        <p className="mt-2 text-xs text-red-700">{batchError}</p>
      ) : data ? (
        <RollingWeekSummaryBody
          data={data}
          dailyTargetKcal={dailyTargetKcal}
          dailyTargetProteinG={dailyTargetProteinG}
          weeklyCoachingFocus={weeklyCoachingFocus}
        />
      ) : null}
    </div>
  );
}

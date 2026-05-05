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
  weeklyImplementationIntention?: string | null;
  loading: boolean;
  batchError: string | null;
  data: WeekInsightPayload | null;
};

export function WeekInsightsCard({
  dailyTargetKcal,
  dailyTargetProteinG = null,
  weeklyCoachingFocus = null,
  weeklyImplementationIntention = null,
  loading,
  batchError,
  data,
}: WeekInsightsCardProps) {
  return (
    <div className="bento-card relative overflow-hidden border-sky-500/20 bg-[#dff1ff] p-6">
      {/* Background Decorative Blur */}
      <div className="hidden" />
      
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-sky-900/75">
          Registry Rhythms
        </p>
        <div className="flex h-1.5 w-1.5 rounded-full bg-sky-600" />
      </div>
      {loading ? (
        <p className="mt-2 text-xs font-bold text-zinc-600 animate-pulse">Synchronizing records…</p>
      ) : batchError ? (
        <p className="mt-2 text-xs font-bold text-red-400/80">{batchError}</p>
      ) : data ? (
        <RollingWeekSummaryBody
          data={data}
          dailyTargetKcal={dailyTargetKcal}
          dailyTargetProteinG={dailyTargetProteinG}
          weeklyCoachingFocus={weeklyCoachingFocus}
          weeklyImplementationIntention={weeklyImplementationIntention}
        />
      ) : null}
    </div>
  );
}

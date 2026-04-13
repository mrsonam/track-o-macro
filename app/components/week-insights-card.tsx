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
    <div className="bento-card relative overflow-hidden bg-zinc-900/40 border-white/5 p-6">
      {/* Background Decorative Blur */}
      <div className="absolute -right-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-500/5 blur-[60px]" />
      
      <div className="flex items-center justify-between mb-6">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
          Registry Rhythms
        </p>
        <div className="flex h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
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

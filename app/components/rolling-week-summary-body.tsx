"use client";

import { useMemo } from "react";
import {
  calorieGoalBlurb,
  proteinGoalBlurb,
} from "@/lib/meals/goal-insight-blurbs";
import { loggingRhythmBlurb } from "@/lib/meals/logging-rhythm-blurb";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { tryThisWeekSuggestion } from "@/lib/meals/try-this-week-suggestion";
import { TrendingUp, Calendar, Zap, Target } from "lucide-react";

export type RollingWeekSummaryData = {
  mealCount: number;
  daysInWindow: number;
  daysWithLogs: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  averages: {
    kcalPerDay: number;
    proteinGPerDay: number;
  };
};

type RollingWeekSummaryBodyProps = {
  data: RollingWeekSummaryData;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
};

export function RollingWeekSummaryBody({
  data,
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
}: RollingWeekSummaryBodyProps) {
  const tryThisWeek = useMemo(
    () =>
      tryThisWeekSuggestion({
        daysWithLogs: data.daysWithLogs,
        daysInWindow: data.daysInWindow,
        mealCount: data.mealCount,
        avgKcalPerDay: data.averages.kcalPerDay,
        avgProteinGPerDay: data.averages.proteinGPerDay,
        dailyTargetKcal,
        dailyTargetProteinG,
        weeklyCoachingFocus: weeklyCoachingFocus ?? null,
      }),
    [data, dailyTargetKcal, dailyTargetProteinG, weeklyCoachingFocus],
  );

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
          <TrendingUp className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {Math.round(data.averages.kcalPerDay)} kcal/day
          </p>
          <p className="text-[11px] leading-tight text-zinc-500">
            {dailyTargetKcal != null && dailyTargetKcal > 0 
              ? calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)
              : "Rolling 7-day average"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
          <Calendar className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {data.daysWithLogs} of {data.daysInWindow} days
          </p>
          <p className="text-[11px] leading-tight text-zinc-500">
            {loggingRhythmBlurb(data.daysWithLogs, data.daysInWindow)}
          </p>
        </div>
      </div>

      {tryThisWeek && (
        <div className="rounded-2xl bg-emerald-500/5 p-4 ring-1 ring-emerald-500/20">
          <div className="mb-2 flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Weekly Focus</span>
          </div>
          <p className="text-xs font-medium italic text-zinc-300">
            &quot;{tryThisWeek}&quot;
          </p>
        </div>
      )}

      <div className="flex items-start gap-4">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
          <Target className="h-4 w-4" />
        </div>
        <div>
          <p className="text-sm font-bold text-white">
            {Math.round(data.totals.protein_g)}g Protein Total
          </p>
          <p className="text-[11px] leading-tight text-zinc-500">
            Average: {Math.round(data.averages.proteinGPerDay)}g/day · {data.mealCount} meals
          </p>
        </div>
      </div>
    </div>
  );
}

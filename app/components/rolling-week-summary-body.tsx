"use client";

import { useMemo } from "react";
import {
  calorieGoalBlurb,
  proteinGoalBlurb,
} from "@/lib/meals/goal-insight-blurbs";
import { loggingRhythmBlurb } from "@/lib/meals/logging-rhythm-blurb";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { tryThisWeekSuggestion } from "@/lib/meals/try-this-week-suggestion";

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
    <div className="mt-2 space-y-2 text-sm text-stone-700">
      <p>
        <span className="font-semibold tabular-nums text-stone-900">
          {Math.round(data.averages.kcalPerDay)}
        </span>{" "}
        <span className="text-stone-600">
          kcal/day average
          {dailyTargetKcal != null ? (
            <>
              {" "}
              <span className="text-stone-500">
                (vs ~{Math.round(dailyTargetKcal)} kcal goal)
              </span>
            </>
          ) : null}
        </span>
      </p>
      {dailyTargetKcal != null && dailyTargetKcal > 0 ? (
        <p className="text-xs leading-relaxed text-stone-600">
          {calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)}
        </p>
      ) : null}
      <p className="text-xs text-stone-600">
        <span className="font-medium tabular-nums text-stone-800">
          {data.daysWithLogs}
        </span>
        {" of "}
        <span className="tabular-nums">{data.daysInWindow}</span> days with a
        log
      </p>
      <p className="text-xs leading-relaxed text-stone-600">
        {loggingRhythmBlurb(data.daysWithLogs, data.daysInWindow)}
      </p>
      {tryThisWeek ? (
        <p className="text-xs leading-relaxed text-stone-700">
          <span className="font-semibold text-emerald-900/90">
            Try this week:{" "}
          </span>
          {tryThisWeek}
        </p>
      ) : null}
      <p className="text-xs text-stone-600">
        <span className="font-medium text-stone-800">
          {Math.round(data.totals.protein_g)}g
        </span>{" "}
        protein over {data.daysInWindow} days
        {dailyTargetProteinG != null && dailyTargetProteinG > 0 ? (
          <>
            {" "}
            <span className="text-stone-500">
              (~{Math.round(data.averages.proteinGPerDay)}g/day avg vs ~
              {Math.round(dailyTargetProteinG)}g goal)
            </span>
          </>
        ) : null}
        {" · "}
        <span className="font-medium tabular-nums text-stone-800">
          {data.mealCount}
        </span>{" "}
        meal{data.mealCount === 1 ? "" : "s"} logged
      </p>
      {dailyTargetProteinG != null && dailyTargetProteinG > 0 ? (
        <p className="text-xs leading-relaxed text-stone-600">
          {proteinGoalBlurb(
            data.averages.proteinGPerDay,
            dailyTargetProteinG,
          )}
        </p>
      ) : null}
      <p className="text-[11px] leading-relaxed text-stone-500">
        Averages divide totals across {data.daysInWindow} calendar days
        (including days with nothing logged).
      </p>
    </div>
  );
}

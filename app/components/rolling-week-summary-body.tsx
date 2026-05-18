"use client";

import { useMemo } from "react";
import Link from "next/link";
import { activeDays14Blurb } from "@/lib/meals/active-days-14-blurb";
import { computeTryThisWeek } from "@/lib/meals/try-this-week-suggestion";
import { computePlanSuggestionBridge } from "@/lib/meals/implementation-intention-bridge";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { TrendingUp, Calendar, Target, AlertTriangle, Moon, Wheat, CalendarClock, ListTodo } from "lucide-react";
import { motion } from "framer-motion";
import type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";

export type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";

type RollingWeekSummaryBodyProps = {
  data: RollingWeekSummaryData;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  weeklyImplementationIntention?: string | null;
  isDetailed?: boolean;
};

function MetricRow({
  label,
  icon,
  value,
  sub,
  warn,
}: {
  label: string;
  icon: React.ReactNode;
  value: string;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 ${warn ? "bg-amber-50/80" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-zinc-500" aria-hidden>
          {icon}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{label}</span>
      </div>
      <div className="text-right">
        <span
          className={`font-mono text-lg font-black tabular-nums sm:text-xl ${warn ? "text-amber-800" : "text-foreground"}`}
        >
          {value}
        </span>
        {sub ? <p className="mt-0.5 text-[10px] font-medium text-zinc-600">{sub}</p> : null}
      </div>
    </div>
  );
}

export function RollingWeekSummaryBody({
  data,
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
  weeklyImplementationIntention = null,
  isDetailed = false,
}: RollingWeekSummaryBodyProps) {
  const surplusThreshold = 1.1;
  const isSurplus =
    dailyTargetKcal != null && data.averages.kcalPerDay > dailyTargetKcal * surplusThreshold;

  const tryWeek = useMemo(
    () =>
      computeTryThisWeek({
        daysWithLogs: data.daysWithLogs,
        daysInWindow: data.daysInWindow,
        mealCount: data.mealCount,
        avgKcalPerDay: data.averages.kcalPerDay,
        avgProteinGPerDay: data.averages.proteinGPerDay,
        dailyTargetKcal,
        dailyTargetProteinG,
        weeklyCoachingFocus: weeklyCoachingFocus ?? null,
      }),
    [
      data.daysWithLogs,
      data.daysInWindow,
      data.mealCount,
      data.averages.kcalPerDay,
      data.averages.proteinGPerDay,
      dailyTargetKcal,
      dailyTargetProteinG,
      weeklyCoachingFocus,
    ],
  );

  const planText = weeklyImplementationIntention?.trim() ?? "";

  const planSuggestionBridge = useMemo(() => {
    if (!planText || !tryWeek.text) return null;
    return computePlanSuggestionBridge(planText, {
      text: tryWeek.text,
      ifThen: tryWeek.ifThen,
    });
  }, [planText, tryWeek.text, tryWeek.ifThen]);

  const kcalSub =
    isDetailed && dailyTargetKcal != null
      ? `Goal ${dailyTargetKcal} kcal · ${Math.round((data.averages.kcalPerDay / dailyTargetKcal) * 100)}% of target`
      : undefined;

  return (
    <div className={isDetailed ? "space-y-5" : "space-y-3"}>
      {planText ? (
        <div className="border-t border-accent-secondary/20 bg-protein-tint/30 px-4 py-4 sm:px-5">
          <div className="mb-2 flex items-center gap-2">
            <ListTodo className="h-4 w-4 text-signal-deep" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-signal-deep">
              Your plan this week
            </p>
          </div>
          <p className="text-sm font-medium leading-relaxed text-foreground">{planText}</p>
          <p className="mt-3 text-[10px] font-medium text-zinc-600">
            Edit in{" "}
            <Link
              href="/settings"
              className="font-bold text-signal-deep underline decoration-accent-secondary/30 underline-offset-2 hover:text-accent-secondary"
            >
              Settings
            </Link>
            .
          </p>
        </div>
      ) : null}

      {data.recovery14 && isDetailed ? (
        <div className="border-t border-sky-800/15 bg-carb-sky/50 px-4 py-4">
          <div className="mb-2 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-sky-800" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-800">
              Active days (last 14)
            </p>
          </div>
          <p className="text-xs leading-relaxed text-zinc-700">
            {data.recovery14.daysWithLogs} of {data.recovery14.daysInWindow} days had at least one log.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700">
            {activeDays14Blurb(data.recovery14.daysWithLogs)}
          </p>
        </div>
      ) : null}

      {isDetailed ? (
        <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white/60">
          <MetricRow
            label="Avg calories"
            icon={
              isSurplus ? (
                <AlertTriangle className="h-3.5 w-3.5 text-amber-700" />
              ) : (
                <TrendingUp className="h-3.5 w-3.5 text-accent-secondary" />
              )
            }
            value={`${Math.round(data.averages.kcalPerDay)} kcal`}
            sub={kcalSub}
            warn={isSurplus}
          />
          <MetricRow
            label="Days logged"
            icon={<Calendar className="h-3.5 w-3.5 text-sky-800" />}
            value={`${data.daysWithLogs} / ${data.daysInWindow}`}
            sub={`${data.mealCount} meal entries`}
          />
          <MetricRow
            label="Avg protein"
            icon={<Target className="h-3.5 w-3.5 text-signal-deep" />}
            value={`${Math.round(data.averages.proteinGPerDay)} g`}
            sub={
              dailyTargetProteinG != null ? `Goal ${dailyTargetProteinG} g per day` : undefined
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className={`flex items-center justify-between rounded-xl border px-3 py-2.5 ${isSurplus ? "border-amber-500/20 bg-amber-50" : "border-black/10 bg-white/60"}`}
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Avg kcal
            </span>
            <span className={`font-mono text-lg font-black ${isSurplus ? "text-amber-800" : "text-foreground"}`}>
              {Math.round(data.averages.kcalPerDay)}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Days
            </span>
            <span className="font-mono text-lg font-black text-foreground">
              {data.daysWithLogs}/{data.daysInWindow}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              Protein
            </span>
            <span className="font-mono text-lg font-black text-foreground">
              {Math.round(data.averages.proteinGPerDay)}g
            </span>
          </div>
        </div>
      )}

      {(data.averages.fiberGPerDay != null ||
        data.averages.sodiumMgPerDay != null ||
        data.averages.sugarGPerDay != null ||
        data.averages.addedSugarGPerDay != null) &&
      (data.averages.fiberGPerDay! > 0 ||
        data.averages.sodiumMgPerDay! > 0 ||
        data.averages.sugarGPerDay! > 0 ||
        (data.averages.addedSugarGPerDay ?? 0) > 0) &&
      isDetailed ? (
        <div className="rounded-2xl border border-black/10 bg-warm-neutral/60 px-4 py-4">
          <div className="mb-3 flex items-center gap-2">
            <Wheat className="h-4 w-4 text-signal-deep" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Micronutrient averages
            </p>
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-zinc-500">
            From entries where USDA-backed data included these nutrients.
          </p>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <li className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Fiber
              </span>
              <span className="font-mono text-base font-black text-foreground">
                {Math.round(data.averages.fiberGPerDay ?? 0)} g/d
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Sodium
              </span>
              <span
                className={`font-mono text-base font-black ${(data.averages.sodiumMgPerDay ?? 0) > 2300 ? "text-amber-800" : "text-foreground"}`}
              >
                {Math.round(data.averages.sodiumMgPerDay ?? 0)} mg/d
              </span>
            </li>
            <li className="flex items-baseline justify-between gap-2 sm:flex-col sm:items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Sugars
              </span>
              <span
                className={`font-mono text-base font-black ${(data.averages.sugarGPerDay ?? 0) > 50 ? "text-amber-800" : "text-foreground"}`}
              >
                {Math.round(data.averages.sugarGPerDay ?? 0)} g/d
              </span>
            </li>
          </ul>
          {(data.averages.addedSugarGPerDay ?? 0) > 0 && (
            <p className="mt-3 text-[10px] font-medium text-zinc-600">
              Logged entries average about {Math.round(data.averages.addedSugarGPerDay ?? 0)} g added
              sugar per day.
            </p>
          )}
        </div>
      ) : null}

      {tryWeek.text ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 px-4 py-4 sm:px-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
            Try this week
          </p>
          <p className={`font-medium leading-relaxed text-foreground ${isDetailed ? "text-base" : "text-xs"}`}>
            {tryWeek.text}
          </p>
          {planSuggestionBridge ? (
            <p
              className={`mt-3 rounded-lg bg-protein-tint/50 p-3 leading-relaxed text-zinc-700 ${isDetailed ? "text-sm" : "text-[11px]"}`}
            >
              {planSuggestionBridge}
            </p>
          ) : null}
          {tryWeek.ifThen ? (
            <p className="mt-3 border-t border-black/10 pt-3 text-[11px] leading-relaxed text-zinc-600">
              <span className="font-bold text-zinc-500">If-then: </span>
              {tryWeek.ifThen}
            </p>
          ) : null}
          <p className="mt-3 text-[10px] font-medium text-zinc-600">
            Suggestions are patterns-only, not medical advice.
          </p>
        </div>
      ) : null}

      {(data.patterns?.weekendDriftLine ||
        data.patterns?.mealTimingBandLine ||
        data.patterns?.lateEatingLine) &&
      isDetailed ? (
        <div className="space-y-2 rounded-2xl border border-black/10 bg-warm-neutral px-4 py-4">
          <div className="flex items-center gap-2">
            <Moon className="h-4 w-4 text-cyan-800" aria-hidden />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Patterns
            </p>
          </div>
          {data.patterns?.weekendDriftLine ? (
            <p className="text-sm leading-relaxed text-zinc-700">{data.patterns.weekendDriftLine}</p>
          ) : null}
          {data.patterns?.mealTimingBandLine ? (
            <p className="text-sm leading-relaxed text-zinc-700">{data.patterns.mealTimingBandLine}</p>
          ) : null}
          {data.patterns?.lateEatingLine ? (
            <p className="text-sm leading-relaxed text-zinc-700">{data.patterns.lateEatingLine}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

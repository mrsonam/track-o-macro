"use client";

import { useMemo } from "react";
import Link from "next/link";
import { activeDays14Blurb } from "@/lib/meals/active-days-14-blurb";
import { computeTryThisWeek } from "@/lib/meals/try-this-week-suggestion";
import { computePlanSuggestionBridge } from "@/lib/meals/implementation-intention-bridge";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import {
  TrendingUp,
  Calendar,
  Target,
  AlertTriangle,
  Moon,
  Wheat,
  CalendarClock,
  ListTodo,
} from "lucide-react";
import { motion } from "framer-motion";
import type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";

export type { RollingWeekSummaryData } from "@/lib/meals/rolling-week-summary-data";

type RollingWeekSummaryBodyProps = {
  data: RollingWeekSummaryData;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  /** Epic 5 — user-authored if–then plan (optional) */
  weeklyImplementationIntention?: string | null;
  /** Use larger typography and high-density spacing for Trends dashboard */
  isDetailed?: boolean;
};

export function RollingWeekSummaryBody({
  data,
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
  weeklyImplementationIntention = null,
  isDetailed = false,
}: RollingWeekSummaryBodyProps) {
  const surplusThreshold = 1.1; // 10% over
  const isSurplus = dailyTargetKcal != null && data.averages.kcalPerDay > dailyTargetKcal * surplusThreshold;

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

  return (
    <div className={isDetailed ? "space-y-5" : "space-y-3"}>
      {planText ? (
        <div className="rounded-2xl border border-[#4f9d45]/25 bg-white/60 p-4 sm:p-5">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#4f9d45]/15 text-[#356d30]">
              <ListTodo className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#356d30]">
              Your plan this week
            </p>
          </div>
          <p className="text-sm font-medium leading-relaxed text-[#171412]">
            {planText}
          </p>
          <p className="mt-3 text-[10px] font-medium text-zinc-600">
            Edit anytime in{" "}
            <Link
              href="/settings"
              className="font-bold text-[#356d30] underline decoration-[#4f9d45]/30 underline-offset-2 hover:text-[#171412]"
            >
              Settings
            </Link>
            .
          </p>
        </div>
      ) : null}

      {data.recovery14 && isDetailed ? (
        <div className="rounded-2xl border border-[#7aa6c2]/25 bg-[#dff1ff]/70 p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#dff1ff] text-[#3b82a0]">
              <CalendarClock className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3b82a0]">
              Active days (last 14)
            </p>
          </div>
          <p className="text-xs leading-relaxed text-zinc-700">
            {data.recovery14.daysWithLogs} of {data.recovery14.daysInWindow} days had
            at least one log — a recovery-friendly view without daily streak pressure.
          </p>
          <p className={`mt-3 leading-relaxed ${isDetailed ? "text-base text-zinc-700" : "text-xs text-zinc-600"}`}>
            {activeDays14Blurb(data.recovery14.daysWithLogs)}
          </p>
        </div>
      ) : null}

      <div className={isDetailed ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "flex flex-col gap-2"}>
        {/* Kcal Metric */}
        <div className={isDetailed ? `flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 ${isSurplus ? "border-amber-500/30 bg-amber-500/10" : "border-black/10 bg-white/60"}` : `flex items-center justify-between rounded-xl border px-3 py-2.5 transition-all duration-300 ${isSurplus ? "border-amber-500/20 bg-amber-500/10" : "border-black/10 bg-white/60"}`}>
          <div className="flex items-center gap-2.5">
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${isSurplus ? "bg-amber-500/20 text-amber-700" : "bg-[#4f9d45]/10 text-[#356d30]"}`}>
              {isSurplus ? <AlertTriangle className="h-3.5 w-3.5 animate-pulse" /> : <TrendingUp className="h-3.5 w-3.5" />}
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Burn</p>
          </div>
          
          <div className={`${isDetailed ? "mb-4" : ""}`}>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono font-black transition-colors ${isDetailed ? "text-4xl" : "text-lg"} ${isSurplus ? "text-amber-700" : "text-[#171412]"}`}>
                {Math.round(data.averages.kcalPerDay)}
              </span>
              <span className={`text-[10px] font-black uppercase ${isSurplus ? "text-amber-700" : "text-zinc-500"}`}>kcal</span>
            </div>
          </div>

          {isDetailed && dailyTargetKcal != null && (
            <div className="space-y-2">
              <div className="h-1 overflow-hidden rounded-full bg-black/10">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (data.averages.kcalPerDay / dailyTargetKcal) * 100)}%` }}
                  className={`h-full ${isSurplus ? "bg-amber-600" : "bg-[#4f9d45]"}`}
                />
              </div>
              <p className="text-[9px] font-bold text-zinc-500">vs {dailyTargetKcal} goal</p>
            </div>
          )}
        </div>

        {/* Rhythm Metric */}
        <div className={isDetailed ? "flex flex-col justify-between rounded-2xl border border-black/10 bg-white/60 p-5" : "flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2.5"}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#dff1ff] text-[#3b82a0]">
              <Calendar className="h-3.5 w-3.5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Rhythm</p>
          </div>

          <div className={`${isDetailed ? "mb-4" : ""}`}>
            <div className="flex items-baseline gap-0.5">
              <span className={`font-mono font-black text-[#171412] ${isDetailed ? "text-4xl" : "text-lg"}`}>{data.daysWithLogs}</span>
              <span className={`mx-0.5 font-black text-zinc-400 ${isDetailed ? "text-2xl" : "text-lg"}`}>/</span>
              <span className={`font-mono font-black text-zinc-600 ${isDetailed ? "text-2xl" : "text-lg"}`}>{data.daysInWindow}</span>
              <span className="ml-1.5 text-[10px] font-black uppercase text-zinc-600">Days</span>
            </div>
          </div>

          {isDetailed && (
            <p className="text-[10px] font-bold text-[#3b82a0] leading-tight">
              System Synchronized
            </p>
          )}
        </div>

        {/* Density Metric */}
        <div className={isDetailed ? "flex flex-col justify-between rounded-2xl border border-black/10 bg-white/60 p-5" : "flex items-center justify-between rounded-xl border border-black/10 bg-white/60 px-3 py-2.5"}>
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Target className="h-3.5 w-3.5" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Density</p>
          </div>

          <div className={`${isDetailed ? "mb-4" : ""}`}>
            <div className="flex items-baseline gap-1.5">
              <span className={`font-mono font-black text-[#171412] ${isDetailed ? "text-4xl" : "text-lg"}`}>{Math.round(data.averages.proteinGPerDay)}g</span>
              <span className="text-[10px] font-black uppercase text-zinc-600">Prot</span>
            </div>
          </div>

          {isDetailed && (
            <div className="flex justify-between items-center text-[10px] font-bold">
              <span className="text-zinc-500">{data.mealCount} entries</span>
              {dailyTargetProteinG && <span className="text-blue-500/60">Target: {dailyTargetProteinG}g</span>}
            </div>
          )}
        </div>
      </div>

      {(data.averages.fiberGPerDay != null ||
        data.averages.sodiumMgPerDay != null ||
        data.averages.sugarGPerDay != null ||
        data.averages.addedSugarGPerDay != null) &&
      (data.averages.fiberGPerDay! > 0 ||
        data.averages.sodiumMgPerDay! > 0 ||
        data.averages.sugarGPerDay! > 0 ||
        (data.averages.addedSugarGPerDay ?? 0) > 0) &&
      isDetailed ? (
        <div className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Wheat className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Averages (fiber, sodium, sugars)
            </p>
          </div>
          <p className="mb-3 text-[10px] leading-relaxed text-zinc-500">
            From entries where USDA-backed data included these nutrients. Gaps stay at zero.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className={`flex flex-col gap-1.5 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 group/item ${isDetailed ? "p-3" : "p-2"}`}>
               <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60 group-hover/item:text-emerald-500 transition-colors">Avg Fiber</span>
               <div className="flex items-baseline gap-0.5">
                 <span className={`font-black text-zinc-900 ${isDetailed ? "text-xl" : "text-base"}`}>{Math.round(data.averages.fiberGPerDay ?? 0)}</span>
                 <span className="text-[8px] font-bold text-zinc-600 uppercase">g/d</span>
               </div>
            </div>
            <div className={`flex flex-col gap-1.5 rounded-xl border group/item ${isDetailed ? "p-3" : "p-2"} ${(data.averages.sodiumMgPerDay ?? 0) > 2300 ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-white border-black/10'}`}>
               <span className={`text-[8px] font-black uppercase tracking-widest group-hover/item:opacity-100 transition-opacity ${(data.averages.sodiumMgPerDay ?? 0) > 2300 ? 'text-amber-500/60' : 'text-zinc-600 opacity-60'}`}>Avg Sodium</span>
               <div className="flex items-baseline gap-0.5">
                 <span className={`font-black ${isDetailed ? "text-xl" : "text-base"} ${(data.averages.sodiumMgPerDay ?? 0) > 2300 ? 'text-amber-600' : 'text-zinc-900'}`}>{Math.round(data.averages.sodiumMgPerDay ?? 0)}</span>
                 <span className="text-[8px] font-bold text-zinc-600 uppercase">mg/d</span>
               </div>
            </div>
            <div className={`flex flex-col gap-1.5 rounded-xl border group/item ${isDetailed ? "p-3" : "p-2"} ${(data.averages.sugarGPerDay ?? 0) > 50 ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-white border-black/10'}`}>
               <span className={`text-[8px] font-black uppercase tracking-widest group-hover/item:opacity-100 transition-opacity ${(data.averages.sugarGPerDay ?? 0) > 50 ? 'text-amber-500/60' : 'text-zinc-600 opacity-60'}`}>Avg Sugars</span>
               <div className="flex items-baseline gap-0.5">
                 <span className={`font-black ${isDetailed ? "text-xl" : "text-base"} ${(data.averages.sugarGPerDay ?? 0) > 50 ? 'text-amber-600' : 'text-zinc-900'}`}>{Math.round(data.averages.sugarGPerDay ?? 0)}</span>
                 <span className="text-[8px] font-bold text-zinc-600 uppercase">g/d</span>
               </div>
            </div>
          </div>
          {(data.averages.addedSugarGPerDay ?? 0) > 0 && (
            <p className={`mt-4 font-bold text-zinc-600 uppercase tracking-widest italic px-1 ${isDetailed ? "text-[9px]" : "text-[8px]"}`}>
              * Archival audit suggests ~{Math.round(data.averages.addedSugarGPerDay ?? 0)}g added sugar per day density.
            </p>
          )}
        </div>
      ) : null}

      {tryWeek.text ? (
        <div className="rounded-2xl border border-black/10 bg-white/60 p-4 sm:p-5">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-900/70">
            Try this week
          </p>
          <p className={`font-medium leading-relaxed text-[#171412] ${isDetailed ? "text-base" : "text-xs"}`}>
            {tryWeek.text}
          </p>
          {planSuggestionBridge ? (
            <p
              className={`mt-3 border-l-2 border-[#4f9d45]/30 pl-3 leading-relaxed text-zinc-600 ${isDetailed ? "text-sm" : "text-[11px]"}`}
            >
              {planSuggestionBridge}
            </p>
          ) : null}
          {tryWeek.ifThen ? (
            <p className="mt-3 border-t border-black/10 pt-3 text-[11px] leading-relaxed text-zinc-600">
              <span className="font-bold text-zinc-400">If–then: </span>
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
        <div className="space-y-3 rounded-2xl border border-black/10 bg-[#f7f3e9] p-4">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#dff1ff] text-[#3b82a0]">
              <Moon className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
              Patterns
            </p>
          </div>
          {data.patterns?.weekendDriftLine ? (
            <p className={`leading-relaxed text-zinc-700 ${isDetailed ? "text-base" : "text-xs"}`}>
              {data.patterns.weekendDriftLine}
            </p>
          ) : null}
          {data.patterns?.mealTimingBandLine ? (
            <p className={`leading-relaxed text-zinc-700 ${isDetailed ? "text-base" : "text-xs"}`}>
              {data.patterns.mealTimingBandLine}
            </p>
          ) : null}
          {data.patterns?.lateEatingLine ? (
            <p className={`leading-relaxed text-zinc-700 ${isDetailed ? "text-base" : "text-xs"}`}>
              {data.patterns.lateEatingLine}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

"use client";

import {
  formatLocalYmd,
  parseLocalYmd,
} from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { motion } from "framer-motion";

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
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Last 7 Days
        </p>
        <div className="h-[1px] flex-1 mx-4 bg-white/5" />
      </div>
      
      <div
        className="flex gap-2 overflow-x-auto pt-4 pb-4 px-1 -mt-4 scroll-smooth no-scrollbar"
        role="tablist"
        aria-label="Daily calories last 7 days"
      >
        {dateKeys.map((key) => {
          const d = parseLocalYmd(key);
          const isToday = key === todayKey;
          const selected = key === selectedDateKey;
          const summary = summariesByKey[key];
          const loading = batchLoading || summary === undefined;
          
          const kcalVal = summary?.totals.kcal ?? 0;
          const kcalDisplay = loading
            ? "..."
            : summary
              ? Math.round(kcalVal)
              : "0";

          const surplusThreshold = 1.1;
          const isSurplus = dailyTargetKcal != null && dailyTargetKcal > 0 && kcalVal > dailyTargetKcal * surplusThreshold;

          const targetRatio =
            dailyTargetKcal != null &&
            dailyTargetKcal > 0
              ? Math.min(1, kcalVal / dailyTargetKcal)
              : 0;

          return (
            <motion.button
              key={key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectDateKey(key)}
              className={`group relative flex min-w-[5.2rem] flex-col items-center rounded-2xl p-4 transition-all ${
                selected
                  ? isSurplus 
                    ? "bg-amber-500 shadow-[0_0_40px_rgba(245,158,11,0.3)] ring-1 ring-amber-400"
                    : "bg-emerald-500 shadow-[0_0_40px_rgba(16,185,129,0.25)] ring-1 ring-emerald-400"
                  : isSurplus
                    ? "bg-amber-950/20 border border-amber-500/20 hover:bg-amber-900/40"
                    : "bg-zinc-900/60 border border-white/5 hover:bg-zinc-800/60"
              }`}
            >
              <span className={`text-[10px] font-black uppercase tracking-wider ${
                selected ? (isSurplus ? "text-amber-950" : "text-emerald-950") : (isSurplus ? "text-amber-500/70" : "text-zinc-500")
              }`}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className={`mt-1 text-lg font-black tabular-nums tracking-tighter ${
                selected ? (isSurplus ? "text-amber-950" : "text-emerald-950") : "text-white"
              }`}>
                {d.getDate()}
              </span>
              
              <div className="mt-3 flex flex-col items-center gap-2 w-full">
                <span className={`text-[11px] font-bold tabular-nums ${
                  selected 
                    ? (isSurplus ? "text-amber-900" : "text-emerald-900") 
                    : (isSurplus ? "text-amber-400 font-black" : "text-emerald-400 font-black")
                }`}>
                  {kcalDisplay}
                </span>
                
                {/* Progress bar */}
                <div className={`h-1.5 w-full overflow-hidden rounded-full ${
                  selected 
                    ? (isSurplus ? "bg-amber-900/20" : "bg-emerald-900/20") 
                    : "bg-zinc-950/80 border border-white/5"
                }`}>
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(targetRatio * 100)}%` }}
                    className={`h-full rounded-full transition-all duration-500 ${
                      selected 
                        ? (isSurplus ? "bg-amber-950" : "bg-emerald-950") 
                        : (isSurplus ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]")
                    }`}
                  />
                </div>
              </div>

              {isToday && (
                <div className={`absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full ${
                  selected ? (isSurplus ? "bg-amber-950" : "bg-emerald-950") : (isSurplus ? "bg-amber-500" : "bg-emerald-500")
                }`}>
                   <div className={`h-1.5 w-1.5 rounded-full ${
                     selected ? (isSurplus ? "bg-amber-400" : "bg-emerald-400") : "bg-zinc-950"
                   }`} />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

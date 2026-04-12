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
        className="flex gap-2 overflow-x-auto pb-2 scroll-smooth no-scrollbar"
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
              className={`group relative flex min-w-[4.5rem] flex-col items-center rounded-2xl p-3 transition-all ${
                selected
                  ? "bg-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-400"
                  : "bg-white/5 border border-white/[0.05] hover:bg-white/10"
              } ${isToday && !selected ? "ring-1 ring-emerald-500/30" : ""}`}
            >
              <span className={`text-[10px] font-bold uppercase ${selected ? "text-emerald-950" : "text-zinc-500"}`}>
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span className={`mt-1 text-base font-black tabular-nums ${selected ? "text-emerald-950" : "text-white"}`}>
                {d.getDate()}
              </span>
              
              <div className="mt-2 flex flex-col items-center gap-1.5 w-full">
                <span className={`text-[11px] font-bold tabular-nums ${selected ? "text-emerald-900" : "text-emerald-500"}`}>
                  {kcalDisplay}
                </span>
                
                {/* Progress dot/bar */}
                <div className={`h-1 w-full overflow-hidden rounded-full ${selected ? "bg-emerald-900/20" : "bg-zinc-800"}`}>
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${selected ? "bg-emerald-950" : "bg-emerald-500"}`}
                    style={{ width: `${Math.round(targetRatio * 100)}%` }}
                  />
                </div>
              </div>

              {isToday && !selected && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-4 ring-background" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

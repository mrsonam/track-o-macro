"use client";

import {
  formatLocalYmd,
  parseLocalYmd,
} from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import type { UnitSystem } from "@/lib/profile/units";
import { Activity, Droplets, Flame } from "lucide-react";
import { motion } from "framer-motion";

type WeekCalorieStripProps = {
  dateKeys: string[];
  selectedDateKey: string;
  onSelectDateKey: (ymd: string) => void;
  dailyTargetKcal: number | null;
  /** Daily fluid goal (ml) for strip progress */
  dailyTargetHydrationMl: number;
  unitSystem: UnitSystem;
  summariesByKey: Record<string, MealDaySummary | null | undefined>;
  batchLoading: boolean;
};

function formatFluidCompact(ml: number, unit: UnitSystem): string {
  if (!Number.isFinite(ml) || ml < 0) return "0";
  const rounded = Math.round(ml);
  if (rounded === 0) return "0";
  if (unit === "imperial") {
    const flOz = ml / 29.5735;
    if (flOz >= 128) return `${(flOz / 128).toFixed(1)} gal`;
    return `${Math.round(flOz)} oz`;
  }
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${rounded} ml`;
}

export function WeekCalorieStrip({
  dateKeys,
  selectedDateKey,
  onSelectDateKey,
  dailyTargetKcal,
  dailyTargetHydrationMl,
  unitSystem,
  summariesByKey,
  batchLoading,
}: WeekCalorieStripProps) {
  const todayKey = formatLocalYmd(new Date());
  const hydrationGoal =
    dailyTargetHydrationMl > 0 ? dailyTargetHydrationMl : 2000;

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
          Last 7 Days
        </p>
        <div className="mx-4 h-[1px] flex-1 bg-black/10" />
      </div>

      <div
        className="-mt-4 flex gap-2 overflow-x-auto px-1 pb-4 pt-4 scroll-smooth no-scrollbar"
        role="tablist"
        aria-label="Daily calories and hydration, last 7 days"
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

          const ah = summary?.appleHealth;
          const appleBurn =
            ah?.activeEnergyKcal != null && ah.activeEnergyKcal > 0
              ? Math.round(ah.activeEnergyKcal)
              : null;
          const appleSteps =
            ah?.steps != null && ah.steps > 0 ? Math.round(ah.steps) : null;

          const mlVal = summary?.hydrationTotalMl ?? 0;
          const fluidDisplay = loading
            ? "..."
            : formatFluidCompact(mlVal, unitSystem);

          const surplusThreshold = 1.1;
          const isSurplus =
            dailyTargetKcal != null &&
            dailyTargetKcal > 0 &&
            kcalVal > dailyTargetKcal * surplusThreshold;

          const targetRatio =
            dailyTargetKcal != null && dailyTargetKcal > 0
              ? Math.min(1, kcalVal / dailyTargetKcal)
              : 0;

          const hydrationRatio =
            hydrationGoal > 0 ? Math.min(1, mlVal / hydrationGoal) : 0;

          return (
            <motion.button
              key={key}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onSelectDateKey(key)}
              className={`focus-ring tap-target group relative flex min-w-[5.75rem] flex-col items-center rounded-2xl p-4 transition-[color,background-color,border-color,box-shadow] duration-200 ${
                selected
                  ? isSurplus
                    ? "bg-[#ffcf72] shadow-[0_18px_46px_-28px_rgba(245,158,11,0.78)] ring-1 ring-amber-400"
                    : "bg-[#4f9d45] shadow-[0_18px_46px_-28px_rgba(79,157,69,0.78)] ring-1 ring-[#4f9d45]"
                  : isSurplus
                    ? "border border-amber-500/25 bg-[#f7f3e9] hover:bg-[#efe7d6]"
                    : "border border-black/10 bg-white/85 hover:bg-[#f2f8ec]"
              }`}
            >
              <span
                className={`text-[10px] font-black uppercase tracking-wider ${
                  selected
                    ? isSurplus
                      ? "text-amber-950"
                      : "text-white"
                    : isSurplus
                      ? "text-amber-700"
                      : "text-zinc-500"
                }`}
              >
                {d.toLocaleDateString(undefined, { weekday: "short" })}
              </span>
              <span
                className={`mt-1 text-lg font-black tabular-nums tracking-tighter ${
                  selected
                    ? isSurplus
                      ? "text-amber-950"
                      : "text-white"
                    : "text-[#171412]"
                }`}
              >
                {d.getDate()}
              </span>

              <div className="mt-3 flex w-full flex-col items-center gap-2">
                <div
                  className={`flex w-full items-center justify-center gap-1 ${
                    selected
                      ? isSurplus
                        ? "text-amber-900"
                        : "text-white"
                      : isSurplus
                        ? "text-amber-700"
                        : "text-[#4f9d45]"
                  }`}
                >
                  <Flame className="h-3 w-3 shrink-0 opacity-90" />
                  <span className="text-[11px] font-black tabular-nums leading-none">
                    {kcalDisplay}
                  </span>
                </div>

                {/* Calories vs target */}
                <div
                  className={`h-1.5 w-full overflow-hidden rounded-full ${
                    selected
                      ? isSurplus
                        ? "bg-amber-900/20"
                        : "bg-white/25"
                      : "border border-black/10 bg-[#f2eadb]"
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(targetRatio * 100)}%` }}
                    className={`h-full rounded-full transition-[width,background-color,box-shadow] duration-500 ${
                      selected
                        ? isSurplus
                          ? "bg-amber-950"
                          : "bg-white"
                        : isSurplus
                          ? "bg-amber-600"
                          : "bg-[#4f9d45]"
                    }`}
                  />
                </div>

                {!loading && (appleBurn != null || appleSteps != null) ? (
                  <div
                    className={`flex w-full flex-col items-center gap-0.5 ${
                      selected
                        ? isSurplus
                        ? "text-amber-950/85"
                        : "text-white/90"
                        : "text-sky-600"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3 shrink-0 opacity-90" />
                      <span className="text-[9px] font-bold tabular-nums leading-tight">
                        {appleSteps != null
                          ? `${appleSteps.toLocaleString()} steps`
                          : appleBurn != null
                            ? `${appleBurn} kcal out`
                            : ""}
                      </span>
                    </div>
                    {appleSteps != null && appleBurn != null ? (
                      <span className="text-[8px] font-semibold tabular-nums opacity-80">
                        {appleBurn} kcal active
                      </span>
                    ) : null}
                  </div>
                ) : null}

                {/* Hydration */}
                <div
                  className={`flex w-full items-center justify-center gap-1 ${
                    selected
                      ? isSurplus
                        ? "text-amber-950/90"
                        : "text-white/90"
                      : "text-sky-600"
                  }`}
                >
                  <Droplets className="h-3 w-3 shrink-0 opacity-90" />
                  <span className="text-[10px] font-bold tabular-nums leading-none">
                    {fluidDisplay}
                  </span>
                </div>
                <div
                  className={`h-1 w-full overflow-hidden rounded-full ${
                    selected
                      ? isSurplus
                        ? "bg-amber-950/25"
                        : "bg-white/25"
                      : "border border-sky-500/20 bg-sky-50"
                  }`}
                >
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round(hydrationRatio * 100)}%` }}
                    className={`h-full rounded-full ${
                      selected
                        ? "bg-sky-100 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]"
                        : "bg-gradient-to-r from-sky-600 to-sky-400 shadow-[0_0_6px_rgba(56,189,248,0.35)]"
                    }`}
                  />
                </div>
              </div>

              {isToday && (
                <div
                  className={`absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full ${
                    selected
                      ? isSurplus
                        ? "bg-amber-950"
                        : "bg-[#171412]"
                      : isSurplus
                        ? "bg-amber-500"
                        : "bg-[#4f9d45]"
                  }`}
                >
                  <div
                    className={`h-1.5 w-1.5 rounded-full ${
                      selected
                        ? isSurplus
                          ? "bg-amber-400"
                          : "bg-white"
                        : "bg-white"
                    }`}
                  />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

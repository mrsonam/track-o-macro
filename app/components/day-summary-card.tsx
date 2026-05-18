"use client";

import { dayHeadingLabel } from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { explainTheDayLines } from "@/lib/meals/explain-the-day";
import { motion } from "framer-motion";
import { EASE_OUT, MotionBento, useAppMotion } from "@/lib/motion";
import { Zap, Target, Flame, Info, Activity } from "lucide-react";
import { rollupHasAnyData } from "@/lib/health/apple-day-rollup";

type DaySummaryCardProps = {
  dateKey: string;
  dailyTargetKcal: number | null;
  dailyTargetProteinG?: number | null;
  loading: boolean;
  batchError: string | null;
  summary: MealDaySummary | null | undefined;
};

function ProgressRing({
  value,
  max,
  color,
  size = 120,
  strokeWidth = 10,
  label,
  progressLabel,
}: {
  value: number;
  max: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  label?: string;
  progressLabel: string;
}) {
  const { motionOn } = useAppMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const clampedMax = max > 0 ? max : 1;
  const progress = Math.min(1, value / clampedMax);
  const offset = circumference - progress * circumference;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={Math.round(Math.max(0, value))}
      aria-valuemin={0}
      aria-valuemax={Math.round(clampedMax)}
      aria-label={progressLabel}
    >
      <svg width={size} height={size} className="rotate-[-90deg]" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-black/10"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={motionOn ? { strokeDashoffset: circumference } : false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: motionOn ? 1.1 : 0, ease: EASE_OUT }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-[#171412]">{Math.round(value)}</span>
        {label && <span className="text-[10px] font-bold uppercase tracking-tight text-zinc-500">{label}</span>}
      </div>
    </div>
  );
}

export function DaySummaryCard({
  dateKey,
  dailyTargetKcal,
  dailyTargetProteinG = null,
  loading,
  batchError,
  summary,
}: DaySummaryCardProps) {
  const heading = dayHeadingLabel(dateKey);
  const showSpinner = loading || summary === undefined;

  const logged = summary?.totals.kcal ?? 0;
  const target = dailyTargetKcal ?? 2000;
  
  const surplusThreshold = 1.1;
  const isSurplus = dailyTargetKcal != null && dailyTargetKcal > 0 && logged > dailyTargetKcal * surplusThreshold;

  const proteinLogged = summary?.totals.protein_g ?? 0;
  const proteinTarget = dailyTargetProteinG ?? 150;

  const explainLines =
    summary && !showSpinner
      ? explainTheDayLines({
          summary,
          totalKcal: logged,
          dailyTargetKcal,
          dailyTargetProteinG,
        })
      : [];

  return (
    <MotionBento
      mount
      index={0}
      className={`bento-card relative overflow-hidden transition-colors duration-500 ${
        isSurplus ? "border-amber-500/30 bg-[#f7f3e9]" : "border-black/[0.08] bg-white/90"
      }`}
    >
      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex-1">
          <h2 className="sr-only">{heading} nutrition summary</h2>
          <div className="mb-6 flex items-center gap-3">
            <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
              isSurplus ? "bg-amber-500/20 text-amber-700" : "bg-[#dff2d3] text-[#4f9d45]"
            }`}>
              {isSurplus ? (
                <Zap className="h-4 w-4 motion-safe:animate-pulse" />
              ) : (
                <Target className="h-4 w-4" />
              )}
            </div>
            <p className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${
              isSurplus ? "text-amber-700" : "text-zinc-500"
            }`}>
              {heading}
              {isSurplus ? " · Over target" : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p
              className={`font-mono text-5xl font-black tracking-tighter transition-colors ${
                isSurplus ? "text-amber-700" : "text-[#171412]"
              }`}
              aria-label={`${Math.round(logged)} kilocalories logged`}
            >
              {Math.round(logged)}{" "}
              <span
                className={`text-xl font-medium ${isSurplus ? "text-amber-800/60" : "text-zinc-500"}`}
                aria-hidden
              >
                kcal
              </span>
            </p>
            {dailyTargetKcal && (
              <div className={`flex items-center gap-3 rounded-xl px-3 py-1.5 w-fit border transition-colors ${
                isSurplus ? "border-amber-500/25 bg-amber-500/10" : "border-[#4f9d45]/20 bg-[#eaf7df]"
              }`}>
                <Flame className={`h-3.5 w-3.5 ${isSurplus ? "text-amber-700" : "text-[#4f9d45]"}`} />
                <span className={`text-xs font-bold ${isSurplus ? "text-amber-800" : "text-[#356d30]"}`}>
                  Target: {Math.round(dailyTargetKcal)} kcal
                </span>
              </div>
            )}
          </div>

          {batchError ? (
            <div
              role="alert"
              className="mt-8 rounded-xl border border-red-500/20 bg-red-500/5 p-4"
            >
              <p className="text-xs font-bold text-red-500">{batchError}</p>
            </div>
          ) : !showSpinner && summary === null ? (
            <p className="mt-8 text-xs font-bold text-red-500">Could not retrieve daily parameters.</p>
          ) : !showSpinner && summary ? (
            <div className="mt-8">
              <div className="grid grid-cols-3 gap-3">
                <div className={`rounded-2xl p-4 border transition-colors ${
                  isSurplus ? "border-amber-500/20 bg-white/50" : "border-black/10 bg-warm-neutral"
                }`}>
                  <span className={`text-[10px] font-black uppercase tracking-widest block mb-1 ${
                    isSurplus ? "text-amber-700" : "text-zinc-500"
                  }`}>Protein</span>
                  <p className={`font-mono text-lg font-black ${isSurplus ? "text-amber-800" : "text-accent-secondary"}`}>
                    {Math.round(summary.totals.protein_g)}<span className="text-[10px] ml-0.5">g</span>
                  </p>
                </div>
                <div className={`rounded-2xl p-4 border transition-colors ${
                  isSurplus ? "border-amber-500/20 bg-white/50" : "border-black/10 bg-warm-neutral"
                }`}>
                  <span className="block mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Carbs</span>
                  <p className="font-mono text-lg font-black text-foreground">{Math.round(summary.totals.carbs_g)}<span className="text-[10px] ml-0.5">g</span></p>
                </div>
                <div className={`rounded-2xl p-4 border transition-colors ${
                  isSurplus ? "border-amber-500/20 bg-white/50" : "border-black/10 bg-warm-neutral"
                }`}>
                  <span className="block mb-1 text-[10px] font-black uppercase tracking-widest text-zinc-500">Fat</span>
                  <p className="font-mono text-lg font-black text-zinc-600">{Math.round(summary.totals.fat_g)}<span className="text-[10px] ml-0.5">g</span></p>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-3 border-t border-black/10 px-1 py-2">
                <Zap className={`h-3.5 w-3.5 ${isSurplus ? "text-amber-700" : "text-accent-secondary"}`} />
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  {summary.mealCount} meal{summary.mealCount === 1 ? "" : "s"} logged
                </p>
              </div>

              {summary.appleHealth &&
              rollupHasAnyData(summary.appleHealth) ? (
                <div className="mt-5 rounded-2xl border border-sky-500/20 bg-sky-500/[0.08] p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Activity className="h-3.5 w-3.5 text-sky-600" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-sky-700">
                      Apple Health
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {summary.appleHealth.steps != null &&
                    summary.appleHealth.steps > 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Steps
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {Math.round(
                            summary.appleHealth.steps,
                          ).toLocaleString()}
                        </p>
                      </div>
                    ) : null}
                    {summary.appleHealth.activeEnergyKcal != null &&
                    summary.appleHealth.activeEnergyKcal > 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Active burn
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {Math.round(summary.appleHealth.activeEnergyKcal)}{" "}
                          <span className="text-[10px] font-bold text-zinc-500">
                            kcal
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {summary.appleHealth.exerciseMinutes != null &&
                    summary.appleHealth.exerciseMinutes > 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Exercise
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {Math.round(summary.appleHealth.exerciseMinutes)}
                          <span className="text-[10px] font-bold text-zinc-500">
                            {" "}
                            min
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {summary.appleHealth.distanceM != null &&
                    summary.appleHealth.distanceM > 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Distance
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {(summary.appleHealth.distanceM / 1000).toFixed(1)}
                          <span className="text-[10px] font-bold text-zinc-500">
                            {" "}
                            km
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {summary.appleHealth.sleepMinutes != null &&
                    summary.appleHealth.sleepMinutes >= 30 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Sleep
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {(summary.appleHealth.sleepMinutes / 60).toFixed(1)}
                          <span className="text-[10px] font-bold text-zinc-500">
                            {" "}
                            h
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {summary.appleHealth.heartRateAvgBpm != null &&
                    summary.appleHealth.heartRateAvgBpm > 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Avg HR
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {Math.round(summary.appleHealth.heartRateAvgBpm)}
                          <span className="text-[10px] font-bold text-zinc-500">
                            {" "}
                            bpm
                          </span>
                        </p>
                      </div>
                    ) : null}
                    {summary.appleHealth.weightKg != null &&
                    summary.appleHealth.weightKg > 0 ? (
                      <div className="rounded-xl border border-black/10 bg-white/60 px-3 py-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-600">
                          Weight
                        </span>
                        <p className="font-mono text-sm font-black tabular-nums text-[#171412]">
                          {summary.appleHealth.weightKg.toFixed(1)}
                          <span className="text-[10px] font-bold text-zinc-500">
                            {" "}
                            kg
                          </span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {explainLines.length > 0 ? (
                <div className="mt-5 space-y-2 rounded-xl bg-[#eaf7df]/50 p-3">
                  {explainLines.map((line, i) => (
                    <p
                      key={i}
                      className="text-xs font-medium leading-relaxed text-zinc-600"
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ) : null}

              {/* Micronutrients (when FDC-backed estimates exist) */}
              <div className="mt-8">
                <div className="mb-4 flex items-center gap-2">
                  <div className="h-[1px] flex-1 bg-black/10" />
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-zinc-500">
                    Fiber · sodium · sugars
                  </p>
                  <div className="h-[1px] flex-1 bg-black/10" />
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl border border-black/10 bg-[#f7f3e9] p-3">
                    <span className="block mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Fiber</span>
                    <p className="font-mono text-sm font-black text-[#4f9d45]">{Math.round(summary.totals.fiber_g)}<span className="text-[9px] ml-0.5 font-bold">g</span></p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-[#f7f3e9] p-3">
                    <span className="block mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Sodium</span>
                    <p className="font-mono text-sm font-black text-[#171412]">{Math.round(summary.totals.sodium_mg)}<span className="text-[9px] ml-0.5 font-bold uppercase">mg</span></p>
                  </div>
                  <div className="rounded-xl border border-black/10 bg-[#f7f3e9] p-3">
                    <span className="block mb-1 text-[9px] font-bold uppercase tracking-widest text-zinc-500">Total sugars</span>
                    <p className="font-mono text-sm font-black text-zinc-600">{Math.round(summary.totals.sugar_g)}<span className="text-[9px] ml-0.5 font-bold">g</span></p>
                    {summary.totals.added_sugar_g != null ? (
                      <p className="mt-1 text-[10px] font-bold text-zinc-600">
                        Added ~{Math.round(summary.totals.added_sugar_g)} g
                      </p>
                    ) : null}
                  </div>
                </div>

                {/* Day notes (soft thresholds — not medical guidance) */}
                {(isSurplus || summary.totals.sodium_mg > 2300 || summary.totals.sugar_g > 50) && (
                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3">
                    <div className="flex items-start gap-3">
                      <Info className="h-3.5 w-3.5 text-amber-500 mt-0.5" />
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] font-medium leading-relaxed text-amber-900/80">
                          {isSurplus && `Roughly ${Math.round(logged - target)} kcal above your usual target today. `}
                          {summary.totals.sodium_mg > 2300 && "Sodium for the day is above a common 2,300 mg reference. Often normal if you ate out or packaged foods. "}
                          {summary.totals.sugar_g > 50 && "Total sugars from logged items are on the higher side for one day."}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {isSurplus && summary.drivers?.kcal && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 border border-amber-500/10">
                              <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-tighter">Kcal Driver:</span>
                              <span className="text-[9px] font-bold text-amber-900 truncate max-w-[120px]">
                                {summary.drivers.kcal.rawInput}
                              </span>
                              <span className="text-[9px] font-black text-amber-500">+{Math.round(summary.drivers.kcal.value)}</span>
                            </div>
                          )}
                          {summary.totals.sodium_mg > 2300 && summary.drivers?.sodium && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 border border-amber-500/10">
                              <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-tighter">Sodium:</span>
                              <span className="text-[9px] font-bold text-amber-900 truncate max-w-[120px]">
                                {summary.drivers.sodium.rawInput}
                              </span>
                              <span className="text-[9px] font-black text-amber-500">{Math.round(summary.drivers.sodium.value)}mg</span>
                            </div>
                          )}
                          {summary.totals.sugar_g > 50 && summary.drivers?.sugar && (
                            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2 py-1 border border-amber-500/10">
                              <span className="text-[9px] font-black text-amber-500/60 uppercase tracking-tighter">Sugar:</span>
                              <span className="text-[9px] font-bold text-amber-900 truncate max-w-[120px]">
                                {summary.drivers.sugar.rawInput}
                              </span>
                              <span className="text-[9px] font-black text-amber-500">{Math.round(summary.drivers.sugar.value)}g</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
             <div className="mt-8 h-24 w-full motion-safe:animate-pulse rounded-2xl bg-black/5" />
          )}
        </div>

        {/* Visual Gauges Section */}
        <div className="flex items-center gap-10 py-4 lg:py-0">
          <div className="flex flex-col items-center gap-4">
            <ProgressRing
              value={logged}
              max={target}
              color={isSurplus ? "#d97706" : "#4f9d45"}
              size={130}
              strokeWidth={12}
              label="Kcal"
              progressLabel="Calories logged today"
            />
            <p
              className={`text-[10px] font-black uppercase tracking-[0.2em] ${
                isSurplus ? "text-amber-600" : "text-zinc-500"
              }`}
            >
              {isSurplus ? "Over target" : "Calories"}
            </p>
          </div>

          {dailyTargetProteinG && (
            <div className="flex flex-col items-center gap-4">
              <ProgressRing
                value={proteinLogged}
                max={proteinTarget}
                color="var(--protein-ring)"
                strokeWidth={10}
                size={100}
                label="Protein"
                progressLabel="Protein logged today"
              />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-protein-ring">
                Protein
              </p>
            </div>
          )}
        </div>
      </div>

      {showSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/45 backdrop-blur-[2px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#4f9d45] border-t-transparent" />
        </div>
      )}
    </MotionBento>
  );
}

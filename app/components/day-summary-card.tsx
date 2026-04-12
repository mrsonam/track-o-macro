"use client";

import { dayHeadingLabel } from "@/lib/meals/local-date";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import { motion } from "framer-motion";
import { Zap, Target, Flame, Info } from "lucide-react";

type DaySummaryCardProps = {
  dateKey: string;
  dailyTargetKcal: number | null;
  dailyTargetProteinG?: number | null;
  loading: boolean;
  batchError: string | null;
  summary: MealDaySummary | null | undefined;
};

function ProgressRing({ value, max, color, size = 120, strokeWidth = 10, label }: { 
  value: number; 
  max: number; 
  color: string; 
  size?: number; 
  strokeWidth?: number;
  label?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(1, value / max);
  const offset = circumference - progress * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-white/5"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black text-white">{Math.round(value)}</span>
        {label && <span className="text-[10px] font-bold uppercase tracking-tight text-white/40">{label}</span>}
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
  const target = dailyTargetKcal ?? 2000; // fallback if not set to show gauge anyway
  
  const proteinLogged = summary?.totals.protein_g ?? 0;
  const proteinTarget = dailyTargetProteinG ?? 150;

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bento-card relative overflow-hidden"
    >
      {/* Background Decorative Blurs */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-lime-500/5 blur-3xl" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="flex-1">
          <div className="mb-4 flex items-center gap-2">
            <Target className="h-4 w-4 text-emerald-500" />
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              {heading}
            </p>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-4xl font-black tracking-tighter text-white">
              {Math.round(logged)} <span className="text-lg font-medium text-zinc-600">kcal</span>
            </h3>
            {dailyTargetKcal && (
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-500/80">
                <Flame className="h-4 w-4" />
                Target active: {Math.round(dailyTargetKcal)} kcal
              </p>
            )}
          </div>

          {batchError ? (
            <p className="mt-4 text-xs font-bold text-red-500">{batchError}</p>
          ) : !showSpinner && summary === null ? (
            <p className="mt-4 text-xs font-bold text-red-500">Could not load this day.</p>
          ) : !showSpinner && summary ? (
            <div className="mt-6">
              <div className="flex flex-wrap gap-4">
                <div className="rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Protein</span>
                  <p className="font-bold text-emerald-400">{Math.round(summary.totals.protein_g)}g</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Carbs</span>
                  <p className="font-bold text-lime-400">{Math.round(summary.totals.carbs_g)}g</p>
                </div>
                <div className="rounded-2xl bg-white/5 px-4 py-2 ring-1 ring-white/5">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Fat</span>
                  <p className="font-bold text-amber-400">{Math.round(summary.totals.fat_g)}g</p>
                </div>
              </div>
              
              <p className="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-500">
                <Zap className="h-3 w-3 text-emerald-500" />
                {summary.mealCount} event{summary.mealCount === 1 ? "" : "s"} recorded today
              </p>
            </div>
          ) : (
             <div className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-white/5 animate-pulse" />
          )}
        </div>

        {/* Visual Gauges Section */}
        <div className="flex items-center gap-8 py-4">
          <div className="flex flex-col items-center gap-3">
            <ProgressRing 
              value={logged} 
              max={target} 
              color="#10b981" 
              size={120} 
              strokeWidth={10} 
              label="Kcal"
            />
            <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-600">Daily Energy</span>
          </div>

          {dailyTargetProteinG && (
            <div className="flex flex-col items-center gap-3">
              <ProgressRing 
                value={proteinLogged} 
                max={proteinTarget} 
                color="#06b6d4" 
                strokeWidth={8} 
                size={90} 
                label="Prot"
              />
              <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-600">Recovery</span>
            </div>
          )}
        </div>
      </div>

      {showSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/20 backdrop-blur-[2px]">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}
    </motion.div>
  );
}

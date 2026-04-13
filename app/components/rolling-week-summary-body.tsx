"use client";

import {
  calorieGoalBlurb,
} from "@/lib/meals/goal-insight-blurbs";
import { loggingRhythmBlurb } from "@/lib/meals/logging-rhythm-blurb";
import { TrendingUp, Calendar, Target, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

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
  weeklyCoachingFocus?: any; 
};

export function RollingWeekSummaryBody({
  data,
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
}: RollingWeekSummaryBodyProps) {
  const surplusThreshold = 1.1; // 10% over
  const isSurplus = dailyTargetKcal != null && data.averages.kcalPerDay > dailyTargetKcal * surplusThreshold;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-3">
        {/* Avgerage Kcal with Mini-Progress */}
        <div className={`flex flex-col gap-3 p-4 rounded-2xl transition-all duration-500 ${
          isSurplus 
            ? "bg-amber-950/40 border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)]" 
            : "bg-zinc-950/60 border-white/5"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                isSurplus ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                {isSurplus ? <AlertTriangle className="h-4 w-4 animate-pulse" /> : <TrendingUp className="h-4 w-4" />}
              </div>
              <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isSurplus ? "text-amber-500/70" : "text-zinc-500"}`}>
                {isSurplus ? "Surplus Detected" : "7-Day Average"}
              </p>
            </div>
            <p className={`text-sm font-black transition-colors ${isSurplus ? "text-amber-400" : "text-white"}`}>
              {Math.round(data.averages.kcalPerDay)} <span className={`${isSurplus ? "text-amber-600" : "text-zinc-600"} text-[10px] uppercase`}>kcal</span>
            </p>
          </div>
          
          {dailyTargetKcal != null && dailyTargetKcal > 0 && (
            <div className="space-y-2">
                <div className={`relative h-1.5 w-full rounded-full overflow-hidden border transition-colors ${
                  isSurplus ? "bg-amber-950 border-amber-500/20" : "bg-zinc-900 border-white/5"
                }`}>
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${Math.min(100, (data.averages.kcalPerDay / dailyTargetKcal) * 100)}%` }}
                     transition={{ duration: 1.5, ease: "easeOut" }}
                     className={`h-full rounded-full ${
                       isSurplus ? "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.4)]" : "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                     }`}
                   />
                </div>
               <p className={`text-[10px] font-bold ${isSurplus ? "text-amber-500/60" : "text-zinc-500"}`}>
                 {isSurplus && <span className="mr-1.5 uppercase tracking-tighter">[Protocol Deviation]</span>}
                 {calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)}
               </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
              <Calendar className="h-4 w-4" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Logging Rhythm
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-black text-white">
              {data.daysWithLogs}<span className="text-zinc-600 tracking-tighter mx-0.5">/</span>{data.daysInWindow} <span className="text-[10px] text-zinc-600 uppercase">days</span>
            </p>
            <p className="text-[10px] font-bold text-violet-500/60 uppercase">Active Records</p>
          </div>
        </div>
      </div>


      <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/60 border border-white/5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
            <Target className="h-4 w-4" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
            Protein Capture
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm font-black text-white">
            {Math.round(data.averages.proteinGPerDay)}g <span className="text-[10px] text-zinc-600 uppercase">avg/day</span>
          </p>
          <p className="text-[10px] font-bold text-blue-500/60 uppercase">{data.mealCount} Operations</p>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatYearMonth,
  labelYearMonth,
  recentYearMonths,
} from "@/lib/meals/local-month";
import {
  calorieGoalBlurb,
  proteinGoalBlurb,
} from "@/lib/meals/goal-insight-blurbs";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { Calendar, BarChart3, Info, AlertTriangle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type MonthPayload = {
  ym: string;
  daysInMonth: number;
  mealCount: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    sugar_g: number;
  };
  averages: {
    kcalPerDay: number;
    proteinGPerDay: number;
    fiberGPerDay: number;
    sodiumMgPerDay: number;
    sugarGPerDay: number;
  };
};

type HistoryMonthInsightsProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
};

export function HistoryMonthInsights({
  dailyTargetKcal,
  dailyTargetProteinG,
}: HistoryMonthInsightsProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const monthOptions = useMemo(() => recentYearMonths(14), []);
  const [selectedYm, setSelectedYm] = useState(() => formatYearMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthPayload | null>(null);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ ym: selectedYm });
      const res = await fetch(`/api/meals/insights/month?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ym?: string;
        daysInMonth?: number;
        mealCount?: number;
        totals?: MonthPayload["totals"];
        averages?: MonthPayload["averages"];
      };
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Could not load month",
        );
        return;
      }
      if (
        json.ym == null ||
        json.daysInMonth == null ||
        json.mealCount == null ||
        !json.totals ||
        !json.averages
      ) {
        setError("Unexpected response");
        return;
      }
      setError(null);
      setData({
        ym: json.ym,
        daysInMonth: json.daysInMonth,
        mealCount: json.mealCount,
        totals: json.totals,
        averages: json.averages,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedYm]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div className="bento-card bg-zinc-900/40 border-white/5 p-6 mb-6">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div className="flex gap-4">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">
              Monthly Analytics
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-500 max-w-[320px] leading-relaxed">
              Performance summary synchronized with local month boundaries. 
              Averages account for the entire duration.
            </p>
          </div>
        </div>
        
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 ml-1">Archive Period</span>
          <select
            value={selectedYm}
            onChange={(e) => setSelectedYm(e.target.value)}
            className="input-field py-2.5 text-xs font-bold bg-zinc-950 w-full sm:w-48 appearance-none"
          >
            {monthOptions.map((ym) => (
              <option key={ym} value={ym} className="bg-zinc-950">
                {labelYearMonth(ym)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AnimatePresence mode="wait">
        {!online && !data ? (
          <motion.div 
            key="offline"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500"
          >
            <AlertTriangle className="h-4 w-4" />
            Establish baseline connectivity to load month summary.
          </motion.div>
        ) : loading && !data ? (
          <motion.div key="loading" className="flex items-center gap-3 text-xs font-bold text-zinc-600 py-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
               <Zap className="h-4 w-4" />
             </motion.div>
            Synchronizing data...
          </motion.div>
        ) : error && !data ? (
          <motion.div 
            key="error"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-xs font-bold text-red-500"
          >
            <AlertTriangle className="h-4 w-4" />
            {error}
          </motion.div>
        ) : data ? (
          <motion.div 
            key="data"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {online && loading && (
              <div className="absolute top-4 right-4 text-[10px] font-bold text-emerald-500/50 flex items-center gap-1">
                 Updating <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 2 }} className="h-1 w-1 rounded-full bg-emerald-500" />
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="rounded-2xl bg-zinc-950/50 border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Daily Average</p>
                    <BarChart3 className="h-4 w-4 text-emerald-500/40" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{Math.round(data.averages.kcalPerDay)}</span>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">kcal</span>
                  </div>
                  {dailyTargetKcal != null && (
                    <div className="mt-3 text-[10px] font-bold text-zinc-600">
                      VS {Math.round(dailyTargetKcal)} kcal Goal
                    </div>
                  )}
                  {dailyTargetKcal != null && dailyTargetKcal > 0 && (
                     <p className="mt-4 text-xs font-medium leading-relaxed text-zinc-400 border-t border-white/5 pt-4">
                       {calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)}
                     </p>
                  )}
               </div>

               <div className="rounded-2xl bg-zinc-950/50 border border-white/5 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Protein Metrics</p>
                    <div className="h-2 w-2 rounded-full bg-violet-500" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-white">{Math.round(data.averages.proteinGPerDay)}g</span>
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">avg/day</span>
                  </div>
                  <div className="mt-3 text-[10px] font-bold text-zinc-600 flex justify-between">
                     <span>{Math.round(data.totals.protein_g)}g Total</span>
                     {dailyTargetProteinG != null && <span>VS {Math.round(dailyTargetProteinG)}g Goal</span>}
                  </div>
                  {dailyTargetProteinG != null && dailyTargetProteinG > 0 && (
                     <p className="mt-4 text-xs font-medium leading-relaxed text-zinc-400 border-t border-white/5 pt-4">
                       {proteinGoalBlurb(data.averages.proteinGPerDay, dailyTargetProteinG, "month")}
                     </p>
                  )}
               </div>
            </div>

            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
               <Info className="h-3 w-3 text-emerald-500" />
               <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                 {data.mealCount} Individual entries recorded in this period
               </p>
            </div>

            {/* Monthly Secondary Registry */}
            <div className="pt-4 border-t border-white/5">
              <div className="mb-6 flex items-center gap-2">
                <div className="h-[1px] flex-1 bg-white/5" />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-zinc-600">
                  Monthly Telemetric Baseline
                </p>
                <div className="h-[1px] flex-1 bg-white/5" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-zinc-950/30 p-5 border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Avg. Fiber</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-emerald-400/80">{Math.round(data.averages.fiberGPerDay)}</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">g/day</span>
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-zinc-700">{Math.round(data.totals.fiber_g)}g Total</div>
                </div>
                
                <div className="rounded-2xl bg-zinc-950/30 p-5 border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Avg. Sodium</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-300">{Math.round(data.averages.sodiumMgPerDay)}</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">mg/day</span>
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-zinc-700">{Math.round(data.totals.sodium_mg / 1000)}k mg Total</div>
                </div>

                <div className="rounded-2xl bg-zinc-950/30 p-5 border border-white/5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-2">Avg. Sugar</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-zinc-500">{Math.round(data.averages.sugarGPerDay)}</span>
                    <span className="text-[10px] font-bold text-zinc-600 uppercase">g/day</span>
                  </div>
                  <div className="mt-2 text-[9px] font-bold text-zinc-700">{Math.round(data.totals.sugar_g)}g Total</div>
                </div>
              </div>

              {/* Monthly Intelligence */}
              {(data.averages.sodiumMgPerDay > 2300 || data.averages.sugarGPerDay > 50) && (
                <div className="mt-6 flex items-start gap-4 rounded-2xl bg-amber-500/5 p-4 border border-amber-500/10">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                    <AlertTriangle className="h-3 w-3" />
                  </div>
                  <p className="text-xs font-medium leading-relaxed text-amber-200/70">
                    <span className="font-black text-amber-500 uppercase tracking-widest mr-2">Archive Feedback:</span>
                    {data.averages.sodiumMgPerDay > 2300 && `Monthly sodium average (${Math.round(data.averages.sodiumMgPerDay)}mg) was above standard baseline. `}
                    {data.averages.sugarGPerDay > 50 && "Average glycemic load was consistently high across this period."}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

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
import { TRENDS_INSIGHT_ANCHORS } from "@/lib/meals/trends-insight-anchors";
import { Calendar, BarChart3, AlertTriangle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CustomSelect } from "@/app/components/custom-select";

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
  topFoods: Array<{ label: string; kcal: number; lineCount: number }>;
  adherence: {
    daysWithLogs: number;
    daysInMonth: number;
    daysNearTarget: number | null;
    targetKcal: number | null;
  };
};

type HistoryMonthInsightsProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  className?: string;
};

export function HistoryMonthInsights({
  dailyTargetKcal,
  dailyTargetProteinG,
  className,
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
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({ ym: selectedYm, timeZone });
      if (dailyTargetKcal != null && Number.isFinite(dailyTargetKcal)) {
        q.set("targetKcal", String(Math.round(dailyTargetKcal)));
      }
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
        topFoods?: MonthPayload["topFoods"];
        adherence?: MonthPayload["adherence"];
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
        !json.averages ||
        !json.topFoods ||
        !json.adherence
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
        topFoods: json.topFoods,
        adherence: json.adherence,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedYm, dailyTargetKcal]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div
      id={TRENDS_INSIGHT_ANCHORS.month}
      className={`bento-card scroll-mt-28 border-black/10 bg-white/85 p-6 mb-8 relative overflow-hidden ${className ?? ""}`}
    >
      <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between mb-10">
        <div className="flex gap-4">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-emerald-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Calendar className="h-5 w-5" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">
              Monthly Intelligence
            </h3>
            <p className="mt-1 text-xs font-medium text-zinc-600 max-w-[320px] leading-relaxed">
              Macro-pattern synthesis for local month boundaries. 
              Archive data reflects verified logs only.
            </p>
          </div>
        </div>
        
        <div className="relative">
          <label className="block mb-2 px-1 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">Archive Selector</label>
          <div className="min-w-[180px]">
            <CustomSelect
              value={selectedYm}
              onChange={setSelectedYm}
              buttonClassName="w-full rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800"
              options={monthOptions.map((ym) => ({
                value: ym,
                label: labelYearMonth(ym),
              }))}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!online && !data ? (
          <motion.div 
            key="offline"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500"
          >
            <AlertTriangle className="h-4 w-4" />
            Connection offline. Archive data unavailable for synchronization.
          </motion.div>
        ) : loading && !data ? (
          <motion.div key="loading" className="flex items-center gap-3 text-xs font-bold text-zinc-600 py-12 justify-center">
            <Zap className="h-4 w-4 animate-pulse text-emerald-500" />
            Fetching historic telemetry…
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
            className="space-y-8"
          >
            {online && loading && (
              <div className="absolute top-4 right-4 text-[10px] font-bold text-emerald-500/50 flex items-center gap-1">
                 Syncing <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Tile 1: Primary Macro Engine */}
              <div className="lg:col-span-2 group relative overflow-hidden rounded-2xl border border-black/10 bg-white p-8 transition-all hover:bg-[#f7f3e9] shadow-[inset_0_0_40px_rgba(23,20,18,0.01)]">
                <div className="absolute top-0 right-0 h-32 w-32 bg-emerald-500/5 rounded-bl-full blur-3xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600 transition-colors group-hover:text-emerald-600">Macro-Pattern Engine</p>
                  </div>
                  <BarChart3 className="h-4 w-4 text-zinc-500 transition-colors group-hover:text-emerald-600" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  {/* Calorie Focus */}
                  <div className="space-y-6">
                    <div>
                      <span className="text-5xl font-black tracking-tighter leading-none text-zinc-950">{Math.round(data.averages.kcalPerDay)}</span>
                      <span className="ml-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Avg kcal / Day</span>
                    </div>
                    
                    {dailyTargetKcal != null && (
                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Target Alignment</span>
                          <span className="text-[10px] font-black text-zinc-400">{Math.round((data.averages.kcalPerDay / dailyTargetKcal) * 100)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full border border-black/10 bg-black/10">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min((data.averages.kcalPerDay / dailyTargetKcal) * 100, 100)}%` }}
                            className={`h-full rounded-full shadow-[0_0_10px_rgba(16,185,129,0.2)] ${data.averages.kcalPerDay > dailyTargetKcal ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          />
                        </div>
                      </div>
                    )}
                    
                    {dailyTargetKcal != null && (
                      <p className="rounded-xl border border-black/10 bg-white p-4 text-sm font-medium leading-relaxed text-zinc-700 transition-colors group-hover:text-zinc-800">
                        {calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)}
                      </p>
                    )}
                  </div>

                  {/* Protein Focus */}
                  <div className="space-y-6">
                    <div>
                      <span className="text-5xl font-black tracking-tighter leading-none text-zinc-950">{Math.round(data.averages.proteinGPerDay)}g</span>
                      <span className="ml-2 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Avg Prot / Day</span>
                    </div>

                    <div className="flex flex-col gap-4">
                      <div className="flex justify-between items-center border-y border-black/10 py-3">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Archive Total</span>
                        <span className="text-sm font-black text-zinc-800">{Math.round(data.totals.protein_g)}g</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-black/10 py-3">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Engine Target</span>
                        <span className="text-sm font-black text-[#4f9d45]">{dailyTargetProteinG ? `${Math.round(dailyTargetProteinG)}g` : "N/A"}</span>
                      </div>
                    </div>

                    {dailyTargetProteinG != null && (
                      <p className="text-sm font-medium leading-relaxed text-zinc-700 transition-colors group-hover:text-zinc-800 italic">
                        {proteinGoalBlurb(data.averages.proteinGPerDay, dailyTargetProteinG, "month")}
                      </p>
                    )}
                  </div>
                </div>
              </div>              {/* Tile 2: Telemetric Baseline & Advisory */}
              <div className="flex flex-col lg:col-span-1 gap-5">
                <div className="flex h-full flex-col justify-between rounded-2xl border border-black/10 bg-white p-6 transition-all hover:bg-[#f7f3e9]">
                  <div className="flex items-center gap-2 mb-8">
                    <Zap className="h-3.5 w-3.5 text-zinc-500" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">Secondary Registry</p>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 mb-8">
                    <div className="flex flex-col gap-2 p-3 rounded-xl bg-emerald-500/[0.03] border border-emerald-500/10 group/item">
                       <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500/60 group-hover/item:text-emerald-500 transition-colors">Fiber</span>
                       <div className="flex items-baseline gap-0.5">
                         <span className="text-xl font-black text-zinc-900">{Math.round(data.averages.fiberGPerDay)}</span>
                         <span className="text-[8px] font-bold text-zinc-600 uppercase">g</span>
                       </div>
                    </div>
                    <div className={`flex flex-col gap-2 p-3 rounded-xl border group/item ${data.averages.sodiumMgPerDay > 2300 ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                       <span className={`text-[8px] font-black uppercase tracking-widest group-hover/item:opacity-100 transition-opacity ${data.averages.sodiumMgPerDay > 2300 ? 'text-amber-500/60' : 'text-zinc-600 opacity-60'}`}>Sodium</span>
                       <div className="flex items-baseline gap-0.5">
                       <span className={`text-xl font-black ${data.averages.sodiumMgPerDay > 2300 ? 'text-amber-600' : 'text-zinc-900'}`}>{Math.round(data.averages.sodiumMgPerDay)}</span>
                         <span className="text-[8px] font-bold text-zinc-600 uppercase">mg</span>
                       </div>
                    </div>
                    <div className={`flex flex-col gap-2 p-3 rounded-xl border group/item ${data.averages.sugarGPerDay > 50 ? 'bg-amber-500/[0.03] border-amber-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                       <span className={`text-[8px] font-black uppercase tracking-widest group-hover/item:opacity-100 transition-opacity ${data.averages.sugarGPerDay > 50 ? 'text-amber-500/60' : 'text-zinc-600 opacity-60'}`}>Sugar</span>
                       <div className="flex items-baseline gap-0.5">
                       <span className={`text-xl font-black ${data.averages.sugarGPerDay > 50 ? 'text-amber-600' : 'text-zinc-900'}`}>{Math.round(data.averages.sugarGPerDay)}</span>
                         <span className="text-[8px] font-bold text-zinc-600 uppercase">g</span>
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-1 w-1 rounded-full ${data.averages.sodiumMgPerDay > 2300 || data.averages.sugarGPerDay > 50 ? "bg-amber-500" : "bg-emerald-500"}`} />
                      <p className={`text-[10px] font-black uppercase tracking-[0.3em] ${data.averages.sodiumMgPerDay > 2300 || data.averages.sugarGPerDay > 50 ? "text-amber-500/70" : "text-emerald-500/70"}`}>Archival Advisory</p>
                    </div>
                    <p className="text-base font-medium text-zinc-700 leading-relaxed italic">
                      {data.averages.sodiumMgPerDay > 2300 
                        ? "Sodium baseline is tracking significantly above recommended levels. Fluid retention audit advised."
                        : data.averages.sugarGPerDay > 50 
                          ? "Sugar pattern exceeds metric baseline. Consider reducing processed entry frequency."
                          : "Metabolic pattern confirms healthy micronutrient density for this segment."}
                    </p>
                  </div>

                  <div className="mt-8 flex items-center justify-between border-t border-black/10 pt-4">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest">Integrity</span>
                      <span className="text-[9px] font-black text-zinc-600">Validated</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[8px] font-black text-zinc-800 uppercase tracking-widest">Segment</span>
                      <div className="text-[9px] font-black text-zinc-600">{data.mealCount} Records</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">
                  Top foods (line items)
                </p>
                {data.topFoods.length === 0 ? (
                  <p className="text-sm text-zinc-600">
                    No line-level data for this month.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {data.topFoods.map((row, i) => (
                      <li
                        key={`${row.label}-${i}`}
                        className="flex items-center justify-between gap-3 border-b border-black/10 pb-3 last:border-0 last:pb-0"
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-zinc-800">
                          {row.label}
                        </span>
                        <span className="shrink-0 text-xs font-bold tabular-nums text-zinc-500">
                          {Math.round(row.kcal)} kcal · {row.lineCount} lines
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="rounded-2xl border border-black/10 bg-white p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500 mb-4">
                  Adherence angle
                </p>
                <div className="space-y-4 text-sm text-zinc-700">
                  <p>
                    <span className="font-bold text-zinc-900">
                      {data.adherence.daysWithLogs}
                    </span>{" "}
                    local days with at least one log (out of{" "}
                    {data.adherence.daysInMonth} in the month).
                  </p>
                  {data.adherence.targetKcal != null &&
                  data.adherence.daysNearTarget != null ? (
                    <p>
                      <span className="font-bold text-emerald-400/90">
                        {data.adherence.daysNearTarget}
                      </span>{" "}
                      days had total calories within about ±12% of your target (
                      {Math.round(data.adherence.targetKcal)} kcal/day). Informal
                      check, not a grade.
                    </p>
                  ) : (
                    <p className="text-zinc-600">
                      Set a calorie target in your profile to see a light
                      “near-target” day count for this month.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

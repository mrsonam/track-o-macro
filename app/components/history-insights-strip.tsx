"use client";

import { useCallback, useEffect, useState } from "react";
import { rolling7WindowBoundsIso, rolling14WindowBoundsIso } from "@/lib/meals/local-date";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { HistoryInsightsCrossLinks } from "@/app/components/history-insights-cross-links";
import { Info, AlertCircle, Zap, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  RollingWeekSummaryBody,
  type RollingWeekSummaryData,
} from "./rolling-week-summary-body";

type HistoryInsightsStripProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  weeklyImplementationIntention?: string | null;
  activeDays14Enabled?: boolean;
  className?: string;
};

export function HistoryInsightsStrip({
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
  weeklyImplementationIntention = null,
  activeDays14Enabled = false,
  className,
}: HistoryInsightsStripProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<RollingWeekSummaryData | null>(null);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { fromIso, toIso } = rolling7WindowBoundsIso();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({
        from: fromIso,
        to: toIso,
        timeZone,
      });
      const res = await fetch(`/api/meals/insights?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        daysInWindow?: number;
        daysWithLogs?: number;
        mealCount?: number;
        totals?: RollingWeekSummaryData["totals"];
        averages?: RollingWeekSummaryData["averages"];
        drifts?: RollingWeekSummaryData["drifts"];
        patterns?: RollingWeekSummaryData["patterns"];
      };
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Could not load summary",
        );
        return;
      }
      if (
        json.daysInWindow == null ||
        json.daysWithLogs == null ||
        json.mealCount == null ||
        !json.totals ||
        !json.averages
      ) {
        setError("Unexpected response");
        return;
      }
      setError(null);
      let payload: RollingWeekSummaryData = {
        daysInWindow: json.daysInWindow,
        daysWithLogs: json.daysWithLogs,
        mealCount: json.mealCount,
        totals: json.totals,
        averages: json.averages,
        drifts: json.drifts,
        patterns: json.patterns,
      };
      if (activeDays14Enabled) {
        const r14 = rolling14WindowBoundsIso();
        const q14 = new URLSearchParams({
          from: r14.fromIso,
          to: r14.toIso,
          timeZone,
          windowDays: "14",
        });
        try {
          const res14 = await fetch(`/api/meals/insights?${q14}`, {
            credentials: "same-origin",
          });
          if (res14.ok) {
            const j14 = (await res14.json()) as { daysWithLogs?: unknown };
            const dw = Number(j14.daysWithLogs);
            if (Number.isFinite(dw)) {
              payload = {
                ...payload,
                recovery14: { daysWithLogs: dw, daysInWindow: 14 },
              };
            }
          }
        } catch {
          /* keep payload without recovery14 */
        }
      }
      setData(payload);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [activeDays14Enabled]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div
      id={HISTORY_INSIGHT_ANCHORS.rollingWeek}
      className={`bento-card scroll-mt-28 border-white/5 bg-zinc-900/40 p-6 ${className ?? ""}`}
    >
      <div className="flex items-start gap-4 mb-8">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-xl bg-emerald-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 border border-emerald-500/20">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">
            Rolling Momentum
          </h3>
          <p className="mt-1 text-xs font-medium text-zinc-500 leading-relaxed max-w-sm">
            Analysis of the last 7 dynamic local days. Patterns derived from real-time log aggregates.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!online && data ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500 mb-4" role="status"
          >
            <Info className="h-4 w-4" />
            Offline — showing cached engine state.
          </motion.div>
        ) : !online ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500 mb-4" role="status"
          >
            <Info className="h-4 w-4" />
            Connectivity required to refresh telemetry.
          </motion.div>
        ) : loading && !data ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-xs font-bold text-zinc-600 py-4"
          >
            <Zap className="h-4 w-4 animate-pulse" />
            Parsing rolling window...
          </motion.div>
        ) : error && !data ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-xs font-bold text-red-500 mb-4" role="alert"
          >
            <AlertCircle className="h-4 w-4" />
            {error}
          </motion.div>
        ) : data ? (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            {online && loading && (
              <div className="mb-4 text-[10px] font-bold text-emerald-500/50 flex items-center gap-1">
                Updating <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
              </div>
            )}
            
            <RollingWeekSummaryBody
              data={data}
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              weeklyCoachingFocus={weeklyCoachingFocus}
              weeklyImplementationIntention={weeklyImplementationIntention}
              isDetailed={true}
            />

            {/* Weekend Drift Analysis (Sat/Sun vs Mon-Fri) */}
            {data.drifts?.weekendAvgKcal != null && data.drifts?.weekdayAvgKcal != null && (
              <div className="border-t border-white/5 pt-8">
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.5)]" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                      Phase Variance Matrix
                    </p>
                  </div>
                  <div className={`rounded-full px-3 py-1 text-[8px] font-black uppercase tracking-widest border shadow-[0_0_15px_-3px_rgba(255,255,255,0.05)] ${
                    Math.abs(data.drifts.weekendAvgKcal - data.drifts.weekdayAvgKcal) > 200 
                      ? "bg-amber-500/10 text-amber-500 border-amber-500/20" 
                      : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  }`}>
                    {Math.abs(data.drifts.weekendAvgKcal - data.drifts.weekdayAvgKcal) > 200 ? "Drift Active" : "Steady State"}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="group flex flex-col justify-between rounded-2xl bg-zinc-950/40 p-6 border border-white/5 hover:bg-zinc-950/60 transition-all relative overflow-hidden">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 group-hover:text-zinc-400 transition-colors">Weekday Baseline</span>
                      <div className="h-2 w-2 rounded-full bg-zinc-800" />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-black text-white">{data.drifts.weekdayAvgKcal}</span>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">kcal</span>
                    </div>
                    <div className="mt-6 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-zinc-900 rounded-full overflow-hidden">
                        <div className="h-full w-full bg-zinc-700/30" />
                      </div>
                      <span className="text-[8px] font-black text-zinc-700 uppercase">Ref</span>
                    </div>
                  </div>

                  <div className={`group flex flex-col justify-between rounded-2xl p-6 border transition-all relative overflow-hidden ${
                    data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200
                      ? "bg-amber-500/[0.03] border-amber-500/20 shadow-[inset_0_0_20px_rgba(245,158,11,0.05)]"
                      : "bg-zinc-950/40 border-white/5 shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] hover:bg-zinc-950/60"
                  }`}>
                    <div className="flex items-center justify-between mb-4">
                      <span className={`text-[9px] font-black uppercase tracking-[0.3em] ${
                        data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200 ? "text-amber-500/80" : "text-zinc-600 group-hover:text-zinc-400"
                      }`}>Weekend Deviation</span>
                      <div className={`h-2 w-2 rounded-full ${
                        data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200 ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-zinc-800"
                      }`} />
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className={`text-3xl font-black ${
                        data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200 ? "text-amber-400" : "text-white"
                      }`}>{data.drifts.weekendAvgKcal}</span>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">kcal</span>
                    </div>
                    
                    <div className="mt-6 space-y-2">
                      <div className="flex justify-between items-center text-[8px] font-black text-zinc-700 uppercase tracking-widest">
                        <span>Relative Drift</span>
                        <span className={data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal ? "text-amber-500/70" : "text-emerald-500/70"}>
                          {data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal ? "+" : ""}{data.drifts.weekendAvgKcal - data.drifts.weekdayAvgKcal} kcal
                        </span>
                      </div>
                      <div className="h-1 bg-zinc-900 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, Math.max(20, (data.drifts.weekendAvgKcal / data.drifts.weekdayAvgKcal) * 100))}%` }}
                          className={`h-full ${data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200 ? "bg-amber-500" : "bg-emerald-500"}`}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <p className="mt-6 text-[10px] items-center gap-2 flex font-medium leading-relaxed text-zinc-500 italic px-1">
                   {Math.abs(data.drifts.weekendAvgKcal - data.drifts.weekdayAvgKcal) > 200 
                    ? <span className="text-amber-500">⚠️ Segment variance exceeds safe baseline (+200kcal)</span>
                    : <span className="text-emerald-500/80">✓ Weekend baseline confirms adherence to weekday rhythm</span>}
                </p>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

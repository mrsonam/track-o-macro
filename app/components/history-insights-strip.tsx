"use client";

import { useCallback, useEffect, useState } from "react";
import { rolling7WindowBoundsIso } from "@/lib/meals/local-date";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import {
  RollingWeekSummaryBody,
  type RollingWeekSummaryData,
} from "./rolling-week-summary-body";
import { TrendingUp, Info, Zap, AlertCircle } from "lucide-react";

type InsightsPayload = RollingWeekSummaryData;

type HistoryInsightsStripProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
};

export function HistoryInsightsStrip({
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
}: HistoryInsightsStripProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<InsightsPayload | null>(null);

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
        totals?: InsightsPayload["totals"];
        averages?: InsightsPayload["averages"];
        drifts?: InsightsPayload["drifts"];
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
      setData({
        daysInWindow: json.daysInWindow,
        daysWithLogs: json.daysWithLogs,
        mealCount: json.mealCount,
        totals: json.totals,
        averages: json.averages,
        drifts: json.drifts,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div className="bento-card border-white/5 bg-zinc-900/40 p-6">
      <div className="flex items-start gap-4 mb-6">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
          <TrendingUp className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500">
            Rolling Week Summary
          </h3>
          <p className="mt-1 text-xs font-medium text-zinc-500 leading-relaxed max-w-sm">
            Same rolling 7 local days as the home log. Totals include every meal in
            that window.
          </p>
        </div>
      </div>
      {!online && data ? (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500 mb-4" role="status">
          <Info className="h-4 w-4" />
          Offline — showing the last loaded summary.
        </div>
      ) : !online ? (
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500 mb-4" role="status">
          <Info className="h-4 w-4" />
          Connect to the internet to load this summary.
        </div>
      ) : loading && !data ? (
        <div className="flex items-center gap-3 text-xs font-bold text-zinc-600 py-4">
          <Zap className="h-4 w-4 animate-pulse" />
          Synchronizing week...
        </div>
      ) : error && !data ? (
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-xs font-bold text-red-500 mb-4" role="alert">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      ) : data ? (
        <>
          {online && loading ? (
            <div className="mb-4 text-[10px] font-bold text-emerald-500/50 flex items-center gap-1">
              Updating <div className="h-1 w-1 animate-pulse rounded-full bg-emerald-500" />
            </div>
          ) : null}
          {error && data ? (
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-xs font-bold text-red-500 mb-4" role="alert">
              <AlertCircle className="h-4 w-4" />
              {error} (previous numbers below)
            </div>
          ) : null}
          <div className="space-y-6">
            <RollingWeekSummaryBody
              data={data}
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              weeklyCoachingFocus={weeklyCoachingFocus}
            />

            {/* Weekend Drift Analysis (Sat/Sun vs Mon-Fri) */}
            {data.drifts?.weekendAvgKcal != null && data.drifts?.weekdayAvgKcal != null && (
              <div className="border-t border-white/5 pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
                      Weekend Variance Matrix
                    </p>
                  </div>
                  {Math.abs(data.drifts.weekendAvgKcal - data.drifts.weekdayAvgKcal) > 200 ? (
                    <div className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-500 border border-amber-500/20">
                      High Drift Detected
                    </div>
                  ) : (
                    <div className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                      Stable Baseline
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 rounded-2xl bg-zinc-950/40 p-4 border border-white/5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Weekdays (M-F)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-white">{data.drifts.weekdayAvgKcal}</span>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">kcal/day</span>
                    </div>
                  </div>
                  <div className={`flex flex-col gap-1.5 rounded-2xl p-4 border transition-colors ${
                    data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-zinc-950/40 border-white/5"
                  }`}>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${
                      data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200 ? "text-amber-600" : "text-zinc-600"
                    }`}>Weekend (S-S)</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-xl font-black ${
                        data.drifts.weekendAvgKcal > data.drifts.weekdayAvgKcal + 200 ? "text-amber-400" : "text-white"
                      }`}>{data.drifts.weekendAvgKcal}</span>
                      <span className="text-[10px] font-bold text-zinc-600 uppercase">kcal/day</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-[10px] font-medium leading-relaxed text-zinc-500 italic">
                  * Calculations derived from local calendar boundaries (SAT-SUN). Variance over 200kcal/day suggests potential lifestyle drift.
                </p>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

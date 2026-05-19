"use client";

import { useCallback, useEffect, useState } from "react";
import { rolling7WindowBoundsIso, rolling14WindowBoundsIso } from "@/lib/meals/local-date";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { Info, AlertCircle, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { alertBanner, fadeUpItem } from "@/lib/motion";
import {
  RollingWeekSummaryBody,
  type RollingWeekSummaryData,
} from "./rolling-week-summary-body";
import { useTrendsInsights } from "@/app/components/trends/trends-insights-context";
import { WeekendDriftSummary } from "@/app/components/trends/weekend-drift-summary";

type HistoryInsightsStripProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyCoachingFocus?: WeeklyCoachingFocus | null;
  activeDays14Enabled?: boolean;
  className?: string;
};

export function HistoryInsightsStrip({
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyCoachingFocus = null,
  activeDays14Enabled = false,
  className,
}: HistoryInsightsStripProps) {
  const shared = useTrendsInsights();
  const onlineLocal = useOnline();
  const syncTick = useMealsSyncTick();
  const online = shared?.online ?? onlineLocal;

  const [loadingLocal, setLoadingLocal] = useState(!shared);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [dataLocal, setDataLocal] = useState<RollingWeekSummaryData | null>(null);

  const loading = shared?.loading ?? loadingLocal;
  const error = shared?.error ?? errorLocal;
  const data = shared?.rolling7 ?? dataLocal;

  const load = useCallback(async () => {
    if (shared) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoadingLocal(false);
      setErrorLocal(null);
      return;
    }
    setLoadingLocal(true);
    setErrorLocal(null);
    try {
      const { fromIso, toIso } = rolling7WindowBoundsIso();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({ from: fromIso, to: toIso, timeZone });
      const res = await fetch(`/api/meals/insights?${q}`, { credentials: "same-origin" });
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
        setErrorLocal(typeof json.error === "string" ? json.error : "Could not load summary");
        return;
      }
      if (
        json.daysInWindow == null ||
        json.daysWithLogs == null ||
        json.mealCount == null ||
        !json.totals ||
        !json.averages
      ) {
        setErrorLocal("Unexpected response");
        return;
      }
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
          const res14 = await fetch(`/api/meals/insights?${q14}`, { credentials: "same-origin" });
          if (res14.ok) {
            const j14 = (await res14.json()) as { daysWithLogs?: unknown };
            const dw = Number(j14.daysWithLogs);
            if (Number.isFinite(dw)) {
              payload = { ...payload, recovery14: { daysWithLogs: dw, daysInWindow: 14 } };
            }
          }
        } catch {
          /* optional 14-day merge */
        }
      }
      setDataLocal(payload);
      setErrorLocal(null);
    } catch {
      setErrorLocal("Network error");
    } finally {
      setLoadingLocal(false);
    }
  }, [shared, activeDays14Enabled]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div
      className={
        className ?? "bento-card scroll-mt-28 border-black/10 bg-white/85 p-6"
      }
    >
      <AnimatePresence mode="wait">
        {!online && data ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4 text-xs font-bold text-amber-800"
            role="status"
          >
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            Offline. Showing your last loaded rolling week.
          </motion.div>
        ) : !online ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4 text-xs font-bold text-amber-800"
            role="status"
          >
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            Connect to load your rolling week summary.
          </motion.div>
        ) : loading && !data ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex items-center gap-3 py-4 text-xs font-bold text-zinc-600"
          >
            <Zap className="h-4 w-4 motion-safe:animate-pulse" aria-hidden />
            Loading rolling week…
          </motion.div>
        ) : error && !data ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </motion.div>
        ) : data ? (
          <motion.div
            variants={fadeUpItem}
            initial="hidden"
            animate="show"
            className="space-y-8"
          >
            {online && loading && (
              <p className="mb-4 flex items-center gap-1 text-[10px] font-bold text-signal-deep/80">
                Updating
                <span className="h-1 w-1 motion-safe:animate-pulse rounded-full bg-accent-secondary" />
              </p>
            )}

            <RollingWeekSummaryBody
              data={data}
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              weeklyCoachingFocus={weeklyCoachingFocus}
              isDetailed
            />

            {data.drifts?.weekendAvgKcal != null && data.drifts?.weekdayAvgKcal != null ? (
              <WeekendDriftSummary
                weekdayAvgKcal={data.drifts.weekdayAvgKcal}
                weekendAvgKcal={data.drifts.weekendAvgKcal}
              />
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

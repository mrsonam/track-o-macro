"use client";

import { useCallback, useEffect, useState } from "react";
import { rolling14WindowBoundsIso } from "@/lib/meals/local-date";
import { fortnightRhythmBlurb } from "@/lib/meals/fortnight-rhythm-blurb";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { Zap, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { alertBanner, fadeUpItem } from "@/lib/motion";

type FortnightPayload = {
  daysInWindow: number;
  daysWithLogs: number;
  mealCount: number;
  averages: { kcalPerDay: number };
};

type HistoryFortnightStripProps = {
  dailyTargetKcal: number | null;
  className?: string;
};

export function HistoryFortnightStrip({
  dailyTargetKcal,
  className,
}: HistoryFortnightStripProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FortnightPayload | null>(null);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { fromIso, toIso } = rolling14WindowBoundsIso();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({
        from: fromIso,
        to: toIso,
        timeZone,
        windowDays: "14",
      });
      const res = await fetch(`/api/meals/insights?${q}`, { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        daysInWindow?: number;
        daysWithLogs?: number;
        mealCount?: number;
        averages?: { kcalPerDay?: number };
      };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not load summary");
        return;
      }
      if (
        json.daysInWindow == null ||
        json.daysWithLogs == null ||
        json.mealCount == null ||
        json.averages?.kcalPerDay == null
      ) {
        setError("Unexpected response");
        return;
      }
      setError(null);
      setData({
        daysInWindow: json.daysInWindow,
        daysWithLogs: json.daysWithLogs,
        mealCount: json.mealCount,
        averages: { kcalPerDay: json.averages.kcalPerDay },
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
    <div
      className={
        className ?? "bento-card scroll-mt-28 border-black/10 bg-white/85 p-6"
      }
    >
      <AnimatePresence mode="wait">
        {!online && !data ? (
          <motion.div
            key="offline"
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4 text-xs font-bold text-amber-800"
            role="status"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Connect to load your 14-day summary.
          </motion.div>
        ) : loading && !data ? (
          <motion.div
            key="loading"
            className="flex items-center gap-3 py-4 text-xs font-bold text-zinc-600"
          >
            <Zap className="h-4 w-4 motion-safe:animate-pulse" aria-hidden />
            Loading 14-day summary…
          </motion.div>
        ) : error && !data ? (
          <motion.div
            key="error"
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
            role="alert"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </motion.div>
        ) : data ? (
          <motion.div
            key="data"
            variants={fadeUpItem}
            initial="hidden"
            animate="show"
            className="space-y-4"
          >
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <li className="rounded-xl border border-black/10 bg-warm-neutral/60 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Days logged</p>
                <p className="mt-0.5 font-mono text-lg font-black tabular-nums">
                  {data.daysWithLogs}/{data.daysInWindow}
                </p>
              </li>
              <li className="rounded-xl border border-black/10 bg-warm-neutral/60 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Meals</p>
                <p className="mt-0.5 font-mono text-lg font-black tabular-nums">{data.mealCount}</p>
              </li>
              <li className="rounded-xl border border-black/10 bg-warm-neutral/60 px-3 py-2.5">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Avg kcal/day</p>
                <p className="mt-0.5 font-mono text-lg font-black tabular-nums">
                  {Math.round(data.averages.kcalPerDay)}
                  {dailyTargetKcal != null ? (
                    <span className="text-sm font-bold text-zinc-500"> / {Math.round(dailyTargetKcal)}</span>
                  ) : null}
                </p>
              </li>
            </ul>
            <div className="flex items-start gap-2 border-t border-black/10 pt-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-800" aria-hidden />
              <p className="text-sm font-medium leading-relaxed text-zinc-700">
                {fortnightRhythmBlurb(data.daysWithLogs, data.daysInWindow)}
              </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

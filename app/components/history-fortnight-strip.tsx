"use client";

import { useCallback, useEffect, useState } from "react";
import { rolling14WindowBoundsIso } from "@/lib/meals/local-date";
import { fortnightRhythmBlurb } from "@/lib/meals/fortnight-rhythm-blurb";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";
import { HistoryInsightsCrossLinks } from "./history-insights-cross-links";
import { Activity, Clock, Zap, Info, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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
      const res = await fetch(`/api/meals/insights?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        daysInWindow?: number;
        daysWithLogs?: number;
        mealCount?: number;
        averages?: { kcalPerDay?: number };
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
      id={HISTORY_INSIGHT_ANCHORS.fortnight}
      className={`bento-card scroll-mt-28 border-white/5 bg-zinc-900/40 p-6 ${className ?? ""}`}
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-violet-400">
            Fortnight Rhythm
          </h3>
          <p className="mt-1 text-xs font-medium text-zinc-500 leading-relaxed">
            Rolling 14-day window synchronized with your device timezone.
          </p>
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
            Establish connectivity to load rhythmic insights.
          </motion.div>
        ) : loading && !data ? (
           <motion.div key="loading" className="flex items-center gap-3 text-xs font-bold text-zinc-600 py-4">
            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
               <Zap className="h-4 w-4" />
             </motion.div>
            Analyzing window...
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
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 rounded-2xl bg-zinc-950/50 border border-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2">
                  <Clock className="h-3 w-3" /> Consistency
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{data.daysWithLogs}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">Logged Days</span>
                </div>
                <div className="mt-2 text-[10px] font-bold text-zinc-600">
                  OF {data.daysInWindow} DAY WINDOW
                </div>
              </div>

              <div className="flex-1 rounded-2xl bg-zinc-950/50 border border-white/5 p-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-3 flex items-center gap-2">
                  <BarChart3 className="h-3 w-3 text-emerald-500" /> Intake Avg
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-white">{Math.round(data.averages.kcalPerDay)}</span>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase">kcal/day</span>
                </div>
                {dailyTargetKcal != null && (
                  <div className="mt-2 text-[10px] font-bold text-zinc-600">
                    VS {Math.round(dailyTargetKcal)} kcal Goal
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/10 space-y-3">
               <div className="flex items-center gap-2">
                 <Info className="h-3 w-3 text-violet-400" />
                 <p className="text-[10px] font-black uppercase tracking-widest text-violet-400">Rhythm Insight</p>
               </div>
               <p className="text-base font-medium leading-relaxed text-zinc-400">
                 {fortnightRhythmBlurb(data.daysWithLogs, data.daysInWindow)}
               </p>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function BarChart3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

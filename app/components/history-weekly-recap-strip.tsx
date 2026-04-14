"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { rolling7WindowBoundsIso } from "@/lib/meals/local-date";
import { weeklyRecapLines } from "@/lib/meals/weekly-recap-lines";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";
import { Award, Info, ShieldAlert, Zap, AlertCircle, ListTodo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
type HistoryWeeklyRecapStripProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  /** Epic 5 — same optional if–then as home / trends week cards */
  weeklyImplementationIntention?: string | null;
  className?: string;
};

export function HistoryWeeklyRecapStrip({
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyImplementationIntention = null,
  className,
}: HistoryWeeklyRecapStripProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wins, setWins] = useState<string[]>([]);
  const [friction, setFriction] = useState<string[]>([]);
  const [hadMeals, setHadMeals] = useState(false);

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
        windowDays: "7",
      });
      const res = await fetch(`/api/meals/insights?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        mealCount?: number;
        daysInWindow?: number;
        daysWithLogs?: number;
        averages?: { kcalPerDay?: number; proteinGPerDay?: number };
        drifts?: {
          weekendAvgKcal?: number | null;
          weekdayAvgKcal?: number | null;
        };
      };
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Could not load recap",
        );
        return;
      }
      if (
        json.mealCount == null ||
        json.daysInWindow == null ||
        json.daysWithLogs == null ||
        json.averages?.kcalPerDay == null ||
        json.averages?.proteinGPerDay == null
      ) {
        setError("Unexpected response");
        return;
      }
      setHadMeals(json.mealCount > 0);
      const { wins: w, friction: f } = weeklyRecapLines({
        daysWithLogs: json.daysWithLogs,
        daysInWindow: json.daysInWindow,
        mealCount: json.mealCount,
        avgKcalPerDay: json.averages.kcalPerDay,
        avgProteinGPerDay: json.averages.proteinGPerDay,
        dailyTargetKcal,
        dailyTargetProteinG,
        weekendAvgKcal: json.drifts?.weekendAvgKcal ?? null,
        weekdayAvgKcal: json.drifts?.weekdayAvgKcal ?? null,
      });
      setWins(w);
      setFriction(f);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [dailyTargetKcal, dailyTargetProteinG]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  const quietWeek =
    hadMeals && wins.length === 0 && friction.length === 0;

  const planFoot = weeklyImplementationIntention?.trim() ?? "";

  return (
    <div
      id={HISTORY_INSIGHT_ANCHORS.weekRecap}
      className={`bento-card scroll-mt-28 border-white/5 bg-zinc-900/40 p-6 ${className ?? ""}`}
    >
      <div className="flex items-start gap-4 mb-8">
        <div className="relative group">
          <div className="absolute -inset-1 rounded-xl bg-teal-500/20 blur-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative h-10 w-10 flex items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 shrink-0 border border-teal-500/20">
            <Award className="h-5 w-5" />
          </div>
        </div>
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-teal-500">
            Performance Recap
          </h3>
          <p className="mt-1 text-xs font-medium text-zinc-500 leading-relaxed max-w-sm">
            Synthesized wins and friction heuristics based on your rolling metabolic window.
          </p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!online && hadMeals ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500 mb-6"
            role="status"
          >
            <Info className="h-4 w-4 shrink-0" />
            Offline—showing cached recap. Refresh to update patterns.
          </motion.div>
        ) : !online ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex items-center gap-3 text-xs font-bold text-amber-500 mb-6"
            role="status"
          >
            <Info className="h-4 w-4 shrink-0" />
            Connection required to build weekly summary.
          </motion.div>
        ) : loading && !hadMeals ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="flex items-center gap-3 text-xs font-bold text-zinc-600 py-4"
          >
            <Zap className="h-4 w-4 animate-pulse" />
            Generating tactical report…
          </motion.div>
        ) : error && !hadMeals ? (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-xs font-bold text-red-500"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {online && loading && (
              <div className="text-[10px] font-bold text-teal-500/50 flex items-center gap-1 mb-4">
                Updating summary <span className="h-1 w-1 animate-pulse rounded-full bg-teal-500" />
              </div>
            )}
            {error && hadMeals ? (
              <div
                className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex items-center gap-3 text-xs font-bold text-red-500 mb-4"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error} (showing previous data)
              </div>
            ) : null}

            {!hadMeals ? (
              <div className="rounded-2xl border border-white/5 bg-zinc-950/40 p-8 text-center">
                <p className="text-sm font-medium text-zinc-500 leading-relaxed italic">
                  &ldquo;The engine requires data to find patterns.&rdquo;
                  <br />
                  <span className="mt-2 block not-italic font-bold text-zinc-600 uppercase tracking-widest text-[10px]">No meals recorded in window</span>
                </p>
              </div>
            ) : quietWeek ? (
              <div className="rounded-2xl border border-zinc-700/20 bg-zinc-950/50 p-6 flex items-start gap-4">
                 <div className="h-9 w-9 shrink-0 rounded-lg bg-zinc-900 border border-white/5 flex items-center justify-center text-zinc-500">
                    <Info className="h-5 w-5" />
                 </div>
                 <div>
                    <p className="text-base font-medium text-zinc-400 leading-relaxed">
                      Tactical baseline is steady. No significant heuristic drift or wins detected. 
                      This indicates a stable routine without outliers.
                    </p>
                    <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                      Steady State Output
                    </p>
                 </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Wins Module */}
                <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.03] p-6 shadow-[inset_0_0_30px_rgba(16,185,129,0.03)] h-full">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-500/80">
                        Baseline Wins
                      </p>
                    </div>
                    <Award className="h-3.5 w-3.5 text-emerald-500/30" />
                  </div>
                  {wins.length > 0 ? (
                    <ul className="space-y-4">
                      {wins.map((line) => (
                        <li
                          key={line}
                          className="text-base font-medium text-zinc-300 leading-relaxed flex gap-3.5 group"
                        >
                          <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black border border-emerald-500/20">
                            +
                          </div>
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-zinc-500 italic px-1">
                      No automated wins surfaced for current telemetry.
                    </p>
                  )}
                </div>

                {/* Friction Module */}
                <div className="rounded-2xl border border-amber-500/10 bg-amber-500/[0.03] p-6 shadow-[inset_0_0_30px_rgba(245,158,11,0.03)] h-full">
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-2.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-500/80">
                        Friction Flags
                      </p>
                    </div>
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500/30" />
                  </div>
                  {friction.length > 0 ? (
                    <ul className="space-y-4">
                      {friction.map((line) => (
                        <li
                          key={line}
                          className="text-base font-medium text-zinc-300 leading-relaxed flex gap-3.5 group"
                        >
                          <div className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-black border border-amber-500/20">
                            !
                          </div>
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-zinc-500 italic text-center py-4">
                      Zero friction flags detected — perfect baseline adherence.
                    </p>
                  )}
                </div>
              </div>
            )}

            {hadMeals && planFoot ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 sm:p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                    <ListTodo className="h-4 w-4" />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400/90">
                    Your plan this week
                  </p>
                </div>
                <p className="text-sm font-medium leading-relaxed text-zinc-200">
                  {planFoot}
                </p>
                <p className="mt-3 text-[10px] font-medium text-zinc-500">
                  Edit in{" "}
                  <Link
                    href="/settings"
                    className="font-bold text-emerald-500/90 underline decoration-emerald-500/30 underline-offset-2 hover:text-emerald-400"
                  >
                    Settings
                  </Link>
                  .
                </p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

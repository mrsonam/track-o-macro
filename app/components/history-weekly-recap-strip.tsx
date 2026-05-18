"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { rolling7WindowBoundsIso } from "@/lib/meals/local-date";
import { weeklyRecapLines } from "@/lib/meals/weekly-recap-lines";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { Award, Info, ShieldAlert, Zap, AlertCircle, ListTodo } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { alertBanner, fadeUpItem } from "@/lib/motion";
import { useTrendsInsights } from "@/app/components/trends/trends-insights-context";

type HistoryWeeklyRecapStripProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  weeklyImplementationIntention?: string | null;
  className?: string;
};

export function HistoryWeeklyRecapStrip({
  dailyTargetKcal,
  dailyTargetProteinG,
  weeklyImplementationIntention = null,
  className,
}: HistoryWeeklyRecapStripProps) {
  const shared = useTrendsInsights();
  const onlineLocal = useOnline();
  const syncTick = useMealsSyncTick();
  const online = shared?.online ?? onlineLocal;

  const [loadingLocal, setLoadingLocal] = useState(!shared);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [winsLocal, setWinsLocal] = useState<string[]>([]);
  const [frictionLocal, setFrictionLocal] = useState<string[]>([]);
  const [hadMealsLocal, setHadMealsLocal] = useState(false);

  const loading = shared?.loading ?? loadingLocal;
  const error = shared?.error ?? errorLocal;
  const wins = shared?.recap.wins ?? winsLocal;
  const friction = shared?.recap.friction ?? frictionLocal;
  const hadMeals = shared?.recap.hadMeals ?? hadMealsLocal;
  const quietWeek = shared?.recap.quietWeek ?? (hadMeals && wins.length === 0 && friction.length === 0);

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
      const q = new URLSearchParams({
        from: fromIso,
        to: toIso,
        timeZone,
        windowDays: "7",
      });
      const res = await fetch(`/api/meals/insights?${q}`, { credentials: "same-origin" });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        mealCount?: number;
        daysInWindow?: number;
        daysWithLogs?: number;
        averages?: { kcalPerDay?: number; proteinGPerDay?: number };
        drifts?: { weekendAvgKcal?: number | null; weekdayAvgKcal?: number | null };
      };
      if (!res.ok) {
        setErrorLocal(typeof json.error === "string" ? json.error : "Could not load recap");
        return;
      }
      if (
        json.mealCount == null ||
        json.daysInWindow == null ||
        json.daysWithLogs == null ||
        json.averages?.kcalPerDay == null ||
        json.averages?.proteinGPerDay == null
      ) {
        setErrorLocal("Unexpected response");
        return;
      }
      setHadMealsLocal(json.mealCount > 0);
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
      setWinsLocal(w);
      setFrictionLocal(f);
      setErrorLocal(null);
    } catch {
      setErrorLocal("Network error");
    } finally {
      setLoadingLocal(false);
    }
  }, [shared, dailyTargetKcal, dailyTargetProteinG]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  const planFoot = weeklyImplementationIntention?.trim() ?? "";

  return (
    <div
      className={
        className ?? "bento-card scroll-mt-28 border-black/10 bg-white/85 p-6"
      }
    >
      <AnimatePresence mode="wait">
        {!online && hadMeals ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4 text-xs font-bold text-amber-800"
            role="status"
          >
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            Offline. Showing cached recap. Refresh when you are back online.
          </motion.div>
        ) : !online ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4 text-xs font-bold text-amber-800"
            role="status"
          >
            <Info className="h-4 w-4 shrink-0" aria-hidden />
            Connect to build your weekly recap.
          </motion.div>
        ) : loading && !hadMeals ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex items-center gap-3 py-4 text-xs font-bold text-zinc-600"
          >
            <Zap className="h-4 w-4 motion-safe:animate-pulse" aria-hidden />
            Loading week in review…
          </motion.div>
        ) : error && !hadMeals ? (
          <motion.div
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
            role="alert"
          >
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
            {error}
          </motion.div>
        ) : (
          <motion.div variants={fadeUpItem} initial="hidden" animate="show" className="space-y-6">
            {online && loading && (
              <p className="mb-4 flex items-center gap-1 text-[10px] font-bold text-sky-800/80">
                Updating
                <span className="h-1 w-1 motion-safe:animate-pulse rounded-full bg-sky-800" />
              </p>
            )}
            {error && hadMeals ? (
              <div
                className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
                role="alert"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
                {error} (showing previous data)
              </div>
            ) : null}

            {!hadMeals ? (
              <div className="rounded-2xl border border-black/10 bg-warm-neutral p-8 text-center">
                <p className="text-sm font-medium leading-relaxed text-zinc-700">
                  Log meals this week to see wins and friction here.
                </p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  No meals in this window
                </p>
              </div>
            ) : quietWeek ? (
              <div className="flex items-start gap-4 rounded-2xl border border-black/10 bg-warm-neutral p-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black/10 bg-white text-zinc-500">
                  <Info className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-base font-medium leading-relaxed text-zinc-700">
                    A steady week: no strong wins or friction flags from your recent logs.
                  </p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    Quiet week
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="rounded-2xl border border-accent-secondary/15 bg-accent-secondary/[0.04] p-6">
                  <div className="mb-5 flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-accent-secondary" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-signal-deep">
                      Wins
                    </p>
                    <Award className="ml-auto h-3.5 w-3.5 text-accent-secondary/40" aria-hidden />
                  </div>
                  {wins.length > 0 ? (
                    <ul className="space-y-4">
                      {wins.map((line) => (
                        <li
                          key={line}
                          className="flex gap-3.5 text-base font-medium leading-relaxed text-zinc-800"
                        >
                          <span
                            className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-accent-secondary/25 bg-protein-tint text-[10px] font-black text-signal-deep"
                            aria-hidden
                          >
                            +
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-zinc-500">No wins surfaced for this window.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6">
                  <div className="mb-5 flex items-center gap-2.5">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-800">
                      Friction
                    </p>
                    <ShieldAlert className="ml-auto h-3.5 w-3.5 text-amber-600/50" aria-hidden />
                  </div>
                  {friction.length > 0 ? (
                    <ul className="space-y-4">
                      {friction.map((line) => (
                        <li
                          key={line}
                          className="flex gap-3.5 text-base font-medium leading-relaxed text-zinc-800"
                        >
                          <span
                            className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-amber-300 bg-amber-100 text-[10px] font-black text-amber-800"
                            aria-hidden
                          >
                            !
                          </span>
                          {line}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm font-medium text-zinc-500">
                      No friction flags for this window.
                    </p>
                  )}
                </div>
              </div>
            )}

            {hadMeals && planFoot ? (
              <div className="rounded-2xl border border-accent-secondary/20 bg-protein-tint/40 p-4 sm:p-5">
                <div className="mb-2 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-protein-tint text-signal-deep">
                    <ListTodo className="h-4 w-4" aria-hidden />
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-signal-deep">
                    Your plan this week
                  </p>
                </div>
                <p className="text-sm font-medium leading-relaxed text-zinc-800">{planFoot}</p>
                <p className="mt-3 text-[10px] font-medium text-zinc-500">
                  Edit in{" "}
                  <Link
                    href="/settings"
                    className="font-bold text-signal-deep underline decoration-accent-secondary/30 underline-offset-2 hover:text-accent-secondary"
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

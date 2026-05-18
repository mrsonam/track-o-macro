"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { rolling7WindowBoundsIso, rolling14WindowBoundsIso } from "@/lib/meals/local-date";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { weeklyRecapLines } from "@/lib/meals/weekly-recap-lines";
import type { RollingWeekSummaryData } from "@/app/components/rolling-week-summary-body";
import type { IntelligenceBriefData } from "@/app/components/trends-intelligence-brief";
import { TrendsSectionNavigator } from "@/app/components/trends-section-navigator";
import { TrendsIntelligenceBrief } from "@/app/components/trends-intelligence-brief";
import {
  TrendsInsightsContextProvider,
  type TrendsInsightsContextValue,
  type TrendsRecapState,
} from "./trends-insights-context";

type TrendsInsightsProviderProps = {
  children: ReactNode;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  activeDays14Enabled?: boolean;
};

const emptyRecap: TrendsRecapState = {
  wins: [],
  friction: [],
  hadMeals: false,
  quietWeek: false,
};

export function TrendsInsightsProvider({
  children,
  dailyTargetKcal,
  dailyTargetProteinG,
  activeDays14Enabled = false,
}: TrendsInsightsProviderProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rolling7, setRolling7] = useState<RollingWeekSummaryData | null>(null);

  const load = useCallback(async () => {
    if (!online) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { fromIso, toIso } = rolling7WindowBoundsIso();
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({ from: fromIso, to: toIso, timeZone, windowDays: "7" });
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
        setError(typeof json.error === "string" ? json.error : "Could not load trends");
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
      setRolling7(payload);
      setError(null);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [online, activeDays14Enabled]);

  useEffect(() => {
    void load();
  }, [load, syncTick]);

  const brief = useMemo((): IntelligenceBriefData | null => {
    if (!rolling7 || rolling7.daysWithLogs === 0) return null;
    const score = Math.round((rolling7.daysWithLogs / rolling7.daysInWindow) * 100);
    const weekendAvg = rolling7.drifts?.weekendAvgKcal;
    const weekdayAvg = rolling7.drifts?.weekdayAvgKcal;
    return {
      daysWithLogs: rolling7.daysWithLogs,
      avgKcal: rolling7.averages.kcalPerDay,
      targetKcal: dailyTargetKcal,
      weekendDrift:
        weekendAvg != null && weekdayAvg != null ? weekendAvg - weekdayAvg : null,
      lateEatingPercent: null,
      consistencyScore: score,
    };
  }, [rolling7, dailyTargetKcal]);

  const recap = useMemo((): TrendsRecapState => {
    if (!rolling7) return emptyRecap;
    const hadMeals = rolling7.mealCount > 0;
    if (!hadMeals) return { ...emptyRecap, hadMeals: false };
    const { wins, friction } = weeklyRecapLines({
      daysWithLogs: rolling7.daysWithLogs,
      daysInWindow: rolling7.daysInWindow,
      mealCount: rolling7.mealCount,
      avgKcalPerDay: rolling7.averages.kcalPerDay,
      avgProteinGPerDay: rolling7.averages.proteinGPerDay,
      dailyTargetKcal,
      dailyTargetProteinG,
      weekendAvgKcal: rolling7.drifts?.weekendAvgKcal ?? null,
      weekdayAvgKcal: rolling7.drifts?.weekdayAvgKcal ?? null,
    });
    return {
      wins,
      friction,
      hadMeals,
      quietWeek: wins.length === 0 && friction.length === 0,
    };
  }, [rolling7, dailyTargetKcal, dailyTargetProteinG]);

  const value = useMemo<TrendsInsightsContextValue>(
    () => ({ online, loading, error, rolling7, brief, recap }),
    [online, loading, error, rolling7, brief, recap],
  );

  return (
    <TrendsInsightsContextProvider value={value}>
      <TrendsSectionNavigator />
      <div className="mt-6 mb-2 sm:mt-8">
        <TrendsIntelligenceBrief
          data={brief}
          loading={loading && online}
          error={error}
          offline={!online}
          hasCachedData={rolling7 != null}
        />
      </div>
      {children}
    </TrendsInsightsContextProvider>
  );
}

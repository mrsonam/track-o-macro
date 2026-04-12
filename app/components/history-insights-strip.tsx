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
    <div className="mt-6 rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white/95 to-emerald-50/35 px-4 py-3 shadow-sm shadow-stone-900/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        This week (history)
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
        Same rolling 7 local days as the home log. Totals include every meal in
        that window, not only the list below. &ldquo;Days with a log&rdquo; uses
        your device time zone on the server.
      </p>
      {!online && data ? (
        <p className="mt-2 text-xs text-amber-900/95" role="status">
          Offline — showing the last loaded summary. Reconnect to refresh.
        </p>
      ) : !online ? (
        <p className="mt-2 text-xs text-amber-900/95" role="status">
          Connect to the internet to load this summary.
        </p>
      ) : loading && !data ? (
        <p className="mt-2 text-xs text-stone-400">Loading…</p>
      ) : error && !data ? (
        <p className="mt-2 text-xs text-red-700" role="alert">
          {error}
        </p>
      ) : data ? (
        <>
          {online && loading ? (
            <p className="mt-2 text-xs text-stone-400">Updating…</p>
          ) : null}
          {error && data ? (
            <p className="mt-2 text-xs text-red-700/95" role="alert">
              {error} (previous numbers below)
            </p>
          ) : null}
          <RollingWeekSummaryBody
            data={data}
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetProteinG={dailyTargetProteinG}
            weeklyCoachingFocus={weeklyCoachingFocus}
          />
        </>
      ) : null}
    </div>
  );
}

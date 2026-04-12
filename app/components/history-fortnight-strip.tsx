"use client";

import { useCallback, useEffect, useState } from "react";
import { rolling14WindowBoundsIso } from "@/lib/meals/local-date";
import { fortnightRhythmBlurb } from "@/lib/meals/fortnight-rhythm-blurb";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";

type FortnightPayload = {
  daysInWindow: number;
  daysWithLogs: number;
  mealCount: number;
  averages: { kcalPerDay: number };
};

type HistoryFortnightStripProps = {
  dailyTargetKcal: number | null;
};

export function HistoryFortnightStrip({
  dailyTargetKcal,
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
    <div className="mt-4 rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white/95 to-violet-50/30 px-4 py-3 shadow-sm shadow-stone-900/5">
      <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
        Last 14 days (history)
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
        Same device time zone as the week strip. A wider window for rhythm, not
        a streak score.
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
        <div className="mt-2 space-y-2 text-sm text-stone-700">
          {online && loading ? (
            <p className="text-xs text-stone-400">Updating…</p>
          ) : null}
          {error && data ? (
            <p className="text-xs text-red-700/95" role="alert">
              {error} (previous numbers below)
            </p>
          ) : null}
          <p className="text-xs text-stone-600">
            <span className="font-medium tabular-nums text-stone-800">
              {data.daysWithLogs}
            </span>
            {" of "}
            <span className="tabular-nums">{data.daysInWindow}</span> days with
            a log
            {" · "}
            <span className="font-medium tabular-nums text-stone-800">
              {data.mealCount}
            </span>{" "}
            meal{data.mealCount === 1 ? "" : "s"}
          </p>
          <p className="text-xs text-stone-600">
            <span className="font-semibold tabular-nums text-stone-900">
              {Math.round(data.averages.kcalPerDay)}
            </span>{" "}
            kcal/day average
            {dailyTargetKcal != null ? (
              <>
                {" "}
                <span className="text-stone-500">
                  (vs ~{Math.round(dailyTargetKcal)} kcal goal)
                </span>
              </>
            ) : null}
          </p>
          <p className="text-xs leading-relaxed text-stone-600">
            {fortnightRhythmBlurb(data.daysWithLogs, data.daysInWindow)}
          </p>
        </div>
      ) : null}
    </div>
  );
}

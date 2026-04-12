"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatYearMonth,
  labelYearMonth,
  recentYearMonths,
} from "@/lib/meals/local-month";
import {
  calorieGoalBlurb,
  proteinGoalBlurb,
} from "@/lib/meals/goal-insight-blurbs";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";

type MonthPayload = {
  ym: string;
  daysInMonth: number;
  mealCount: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  averages: {
    kcalPerDay: number;
    proteinGPerDay: number;
  };
};

type HistoryMonthInsightsProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
};

export function HistoryMonthInsights({
  dailyTargetKcal,
  dailyTargetProteinG,
}: HistoryMonthInsightsProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const monthOptions = useMemo(() => recentYearMonths(14), []);
  const [selectedYm, setSelectedYm] = useState(() => formatYearMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthPayload | null>(null);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ ym: selectedYm });
      const res = await fetch(`/api/meals/insights/month?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ym?: string;
        daysInMonth?: number;
        mealCount?: number;
        totals?: MonthPayload["totals"];
        averages?: MonthPayload["averages"];
      };
      if (!res.ok) {
        setError(
          typeof json.error === "string" ? json.error : "Could not load month",
        );
        return;
      }
      if (
        json.ym == null ||
        json.daysInMonth == null ||
        json.mealCount == null ||
        !json.totals ||
        !json.averages
      ) {
        setError("Unexpected response");
        return;
      }
      setError(null);
      setData({
        ym: json.ym,
        daysInMonth: json.daysInMonth,
        mealCount: json.mealCount,
        totals: json.totals,
        averages: json.averages,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedYm]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div className="mt-4 rounded-2xl border border-stone-200/90 bg-gradient-to-br from-white/95 to-teal-50/30 px-4 py-3 shadow-sm shadow-stone-900/5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">
            Calendar month
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
            Local month boundaries. Averages divide totals by the number of days
            in that month (including days with nothing logged).
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-stone-600 sm:min-w-[12rem]">
          Month
          <select
            value={selectedYm}
            onChange={(e) => setSelectedYm(e.target.value)}
            className="input-field py-2 text-sm font-medium text-stone-900"
          >
            {monthOptions.map((ym) => (
              <option key={ym} value={ym}>
                {labelYearMonth(ym)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!online && data ? (
        <p className="mt-2 text-xs text-amber-900/95" role="status">
          Offline — showing the last loaded month summary. Reconnect to refresh.
        </p>
      ) : !online ? (
        <p className="mt-2 text-xs text-amber-900/95" role="status">
          Connect to the internet to load a month summary.
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
          <p>
            <span className="font-semibold tabular-nums text-stone-900">
              {Math.round(data.averages.kcalPerDay)}
            </span>{" "}
            <span className="text-stone-600">
              kcal/day average
              {dailyTargetKcal != null ? (
                <>
                  {" "}
                  <span className="text-stone-500">
                    (vs ~{Math.round(dailyTargetKcal)} kcal goal)
                  </span>
                </>
              ) : null}
            </span>
          </p>
          {dailyTargetKcal != null && dailyTargetKcal > 0 ? (
            <p className="text-xs leading-relaxed text-stone-600">
              {calorieGoalBlurb(data.averages.kcalPerDay, dailyTargetKcal)}
            </p>
          ) : null}
          <p className="text-xs text-stone-600">
            <span className="font-medium text-stone-800">
              {Math.round(data.totals.protein_g)}g
            </span>{" "}
            protein in {data.daysInMonth} days
            {dailyTargetProteinG != null && dailyTargetProteinG > 0 ? (
              <>
                {" "}
                <span className="text-stone-500">
                  (~{Math.round(data.averages.proteinGPerDay)}g/day avg vs ~
                  {Math.round(dailyTargetProteinG)}g goal)
                </span>
              </>
            ) : null}
            {" · "}
            <span className="font-medium tabular-nums text-stone-800">
              {data.mealCount}
            </span>{" "}
            meal{data.mealCount === 1 ? "" : "s"} logged
          </p>
          {dailyTargetProteinG != null && dailyTargetProteinG > 0 ? (
            <p className="text-xs leading-relaxed text-stone-600">
              {proteinGoalBlurb(
                data.averages.proteinGPerDay,
                dailyTargetProteinG,
                "month",
              )}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

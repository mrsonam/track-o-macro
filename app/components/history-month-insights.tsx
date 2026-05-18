"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  formatYearMonth,
  recentYearMonths,
} from "@/lib/meals/local-month";
import { useOnline } from "@/lib/meals/use-online";
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { alertBanner, fadeUpItem } from "@/lib/motion";
import {
  MonthHistoryView,
  type MonthInsightsPayload,
} from "@/app/components/trends/month-history/month-history-view";
import { MonthHistorySkeleton } from "@/app/components/trends/month-history/month-history-skeleton";
import { labelYearMonth } from "@/lib/meals/local-month";
import { CustomSelect } from "@/app/components/custom-select";
import { Calendar } from "lucide-react";

type HistoryMonthInsightsProps = {
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  className?: string;
};

export function HistoryMonthInsights({
  dailyTargetKcal,
  dailyTargetProteinG,
  className,
}: HistoryMonthInsightsProps) {
  const online = useOnline();
  const syncTick = useMealsSyncTick();
  const monthOptions = useMemo(() => recentYearMonths(14), []);
  const [selectedYm, setSelectedYm] = useState(() => formatYearMonth(new Date()));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MonthInsightsPayload | null>(null);

  const load = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({ ym: selectedYm, timeZone });
      if (dailyTargetKcal != null && Number.isFinite(dailyTargetKcal)) {
        q.set("targetKcal", String(Math.round(dailyTargetKcal)));
      }
      const res = await fetch(`/api/meals/insights/month?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ym?: string;
        daysInMonth?: number;
        mealCount?: number;
        totals?: MonthInsightsPayload["totals"];
        averages?: MonthInsightsPayload["averages"];
        topFoods?: MonthInsightsPayload["topFoods"];
        adherence?: MonthInsightsPayload["adherence"];
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
        !json.averages ||
        !json.topFoods ||
        !json.adherence
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
        topFoods: json.topFoods,
        adherence: json.adherence,
      });
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [selectedYm, dailyTargetKcal]);

  useEffect(() => {
    void load();
  }, [load, online, syncTick]);

  return (
    <div
      className={
        className ??
        "bento-card scroll-mt-28 border-black/10 bg-white/85 p-6 mb-8 relative overflow-hidden"
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
            className="space-y-6"
          >
            <MonthPickerToolbar
              selectedYm={selectedYm}
              monthOptions={monthOptions}
              onMonthChange={setSelectedYm}
            />
            <div
              className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-amber-50 p-4 text-xs font-bold text-amber-800"
              role="status"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              Connect to load this month.
            </div>
          </motion.div>
        ) : loading && !data ? (
          <div key="loading" className="space-y-6">
            <MonthPickerToolbar
              selectedYm={selectedYm}
              monthOptions={monthOptions}
              onMonthChange={setSelectedYm}
            />
            <MonthHistorySkeleton />
          </div>
        ) : error && !data ? (
          <motion.div
            key="error"
            variants={alertBanner}
            initial="hidden"
            animate="show"
            exit="exit"
            className="space-y-6"
          >
            <MonthPickerToolbar
              selectedYm={selectedYm}
              monthOptions={monthOptions}
              onMonthChange={setSelectedYm}
            />
            <div
              className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700"
              role="alert"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              {error}
            </div>
          </motion.div>
        ) : data ? (
          <motion.div
            key={`data-${data.ym}`}
            variants={fadeUpItem}
            initial="hidden"
            animate="show"
          >
            <MonthHistoryView
              data={data}
              selectedYm={selectedYm}
              monthOptions={monthOptions}
              onMonthChange={setSelectedYm}
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              updating={online && loading}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MonthPickerToolbar({
  selectedYm,
  monthOptions,
  onMonthChange,
}: {
  selectedYm: string;
  monthOptions: string[];
  onMonthChange: (ym: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-warm-neutral text-zinc-700"
          aria-hidden
        >
          <Calendar className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">Viewing</p>
          <p className="truncate font-mono text-xl font-black tracking-tight text-foreground">
            {labelYearMonth(selectedYm)}
          </p>
        </div>
      </div>
      <div className="w-full sm:w-auto sm:min-w-[200px]">
        <label className="mb-2 block text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">
          Change month
        </label>
        <CustomSelect
          value={selectedYm}
          onChange={onMonthChange}
          buttonClassName="focus-ring w-full cursor-pointer rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-bold text-zinc-800 transition-colors duration-200 hover:border-black/20"
          options={monthOptions.map((ym) => ({
            value: ym,
            label: labelYearMonth(ym),
          }))}
        />
      </div>
    </div>
  );
}

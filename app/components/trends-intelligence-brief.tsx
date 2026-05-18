"use client";

import Link from "next/link";
import { AlertCircle, Brain, ChevronRight, Info, TrendingUp, Zap } from "lucide-react";
import { MotionBento } from "@/lib/motion";
import { TrendsKpiChip } from "@/app/components/trends/trends-kpi-chip";

export type IntelligenceBriefData = {
  daysWithLogs: number;
  avgKcal: number;
  targetKcal: number | null;
  weekendDrift: number | null;
  lateEatingPercent: number | null;
  consistencyScore: number;
};

type TrendsIntelligenceBriefProps = {
  data: IntelligenceBriefData | null;
  loading: boolean;
  error?: string | null;
  offline?: boolean;
  hasCachedData?: boolean;
};

export function TrendsIntelligenceBrief({
  data,
  loading,
  error = null,
  offline = false,
  hasCachedData = false,
}: TrendsIntelligenceBriefProps) {
  if (loading) {
    return (
      <div
        className="mb-10 w-full motion-safe:animate-pulse rounded-3xl border border-black/10 bg-white/90 p-6 sm:p-8 lg:mb-12"
        aria-hidden
      >
        <div className="mb-4 flex gap-2">
          <div className="h-14 flex-1 rounded-xl bg-warm-neutral" />
          <div className="h-14 flex-1 rounded-xl bg-warm-neutral" />
          <div className="h-14 flex-1 rounded-xl bg-warm-neutral" />
        </div>
        <div className="mb-3 h-3 w-28 rounded bg-accent-secondary/20" />
        <div className="mb-4 h-7 w-72 max-w-full rounded bg-zinc-200/80" />
        <div className="h-4 w-full max-w-md rounded bg-zinc-200/60" />
      </div>
    );
  }

  if (offline && !data) {
    return (
      <div
        className="mb-10 rounded-3xl border border-amber-200/60 bg-amber-50 p-6 sm:p-8 lg:mb-12"
        role="status"
      >
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-800" aria-hidden />
          <div>
            <p className="text-sm font-bold text-amber-900">You are offline</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800/90">
              {hasCachedData
                ? "Weekly sections below show your last loaded data. Reconnect to refresh."
                : "Connect to load this week’s insight and rolling summary."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div
        className="mb-10 rounded-3xl border border-red-200 bg-red-50 p-6 sm:p-8 lg:mb-12"
        role="alert"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700" aria-hidden />
          <div>
            <p className="text-sm font-bold text-red-800">Could not load weekly insight</p>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.daysWithLogs === 0) {
    return (
      <div
        className="mb-10 rounded-3xl border border-black/10 bg-warm-neutral p-6 sm:p-8 lg:mb-12"
        role="status"
      >
        <p className="text-sm font-bold text-foreground">Log a few days to unlock weekly insight</p>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-600">
          Once you have meals in this rolling window, you will see one clear takeaway here plus
          detailed averages below.
        </p>
        <Link
          href="/"
          className="focus-ring tap-target mt-4 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-black/10 bg-white px-4 py-2.5 text-xs font-black uppercase tracking-wider text-signal-deep transition-colors duration-200 hover:border-accent-secondary/30 hover:bg-protein-tint"
        >
          Log a meal
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </div>
    );
  }

  const getOneBigThing = () => {
    if (data.weekendDrift && data.weekendDrift > 300) {
      return {
        title: "Weekend intake drift",
        description: `Weekend days average about ${Math.round(data.weekendDrift)} kcal above weekdays. Tightening Saturday and Sunday logging often stabilizes the weekly curve.`,
        icon: TrendingUp,
      };
    }
    if (data.targetKcal && data.avgKcal > data.targetKcal + 200) {
      return {
        title: "Above target this window",
        description: `You are averaging about ${Math.round(data.avgKcal - data.targetKcal)} kcal above target. Evening portion sizes are a common place to adjust.`,
        icon: AlertCircle,
      };
    }
    if (data.consistencyScore > 85) {
      return {
        title: "Strong logging week",
        description:
          "Meal boundaries are well covered this week. That consistency makes the rolling averages more trustworthy.",
        icon: Zap,
      };
    }
    return {
      title: "Steady patterns",
      description:
        "Intake is within normal variance for your recent window. Keeping the same routine helps the trend line stay interpretable.",
      icon: Brain,
    };
  };

  const insight = getOneBigThing();
  const Icon = insight.icon;
  const targetDelta =
    data.targetKcal != null ? Math.round(data.avgKcal - data.targetKcal) : null;

  return (
    <MotionBento
      mount
      className="mb-10 overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-6 shadow-[0_18px_60px_-40px_rgba(23,20,18,0.35)] sm:p-8 lg:mb-12"
    >
      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <TrendsKpiChip label="Days logged" value={`${data.daysWithLogs}/7`} accent="signal" />
        <TrendsKpiChip label="Avg kcal" value={`${Math.round(data.avgKcal)}`} accent="signal" />
        <TrendsKpiChip
          label={targetDelta != null ? "Vs target" : "Consistency"}
          value={
            targetDelta != null
              ? `${targetDelta >= 0 ? "+" : ""}${targetDelta}`
              : `${data.consistencyScore}%`
          }
          accent={targetDelta != null && targetDelta > 100 ? "carb" : "neutral"}
        />
      </div>

      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-warm-neutral text-signal-deep"
            aria-hidden
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
              Weekly insight
            </p>
            <p className="mt-1.5 text-lg font-black tracking-tight text-foreground sm:text-xl">
              {insight.title}
            </p>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-700">
              {insight.description}
            </p>
          </div>
      </div>
    </MotionBento>
  );
}

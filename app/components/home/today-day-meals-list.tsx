"use client";

import Link from "next/link";
import type { DayMealPreview } from "@/lib/meals/day-meal-preview";
import { logHrefForDateKey } from "@/lib/meals/log-href";
import { MotionBento } from "@/lib/motion";
import { ChevronRight } from "lucide-react";
import { dash } from "@/lib/ui/dashboard-tokens";

type Props = {
  dateKey: string;
  meals: DayMealPreview[] | undefined;
  loading: boolean;
  error: string | null;
};

function mealPreview(raw: string, max = 80): string {
  const line = raw.split(/\n/)[0]?.trim() ?? raw.trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

function formatMealTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodayDayMealsList({
  dateKey,
  meals,
  loading,
  error,
}: Props) {
  const logHref = logHrefForDateKey(dateKey);

  if (loading) {
    return (
      <div
        className="bento-card space-y-3 p-5"
        aria-busy="true"
        aria-label="Loading meals"
      >
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 motion-safe:animate-pulse rounded-2xl bg-black/10"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <p
        role="alert"
        className="rounded-2xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-xs font-bold text-red-500"
      >
        {error}
      </p>
    );
  }

  if (!meals || meals.length === 0) return null;

  return (
    <MotionBento index={2} className="bento-card p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className={dash.labelSection}>Logged meals</h3>
        <span className="rounded-md bg-protein-tint px-2 py-0.5 text-[10px] font-bold text-signal-deep">
          {meals.length}
        </span>
      </div>

      <ul className="divide-y divide-black/10" aria-label="Meals logged this day">
        {meals.map((meal) => (
          <li
            key={meal.id}
            className="flex min-h-[52px] items-center gap-3 py-3 first:pt-0"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-foreground">
                {mealPreview(meal.rawInput)}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-zinc-600">
                {formatMealTime(meal.createdAt)}
                {meal.totalProteinG != null && meal.totalProteinG > 0
                  ? ` · ${Math.round(meal.totalProteinG)} g protein`
                  : ""}
              </p>
            </div>
            <span className={`shrink-0 text-sm ${dash.monoData}`}>
              {Math.round(meal.totalKcal)}
              <span className="text-[10px] font-bold text-zinc-500"> kcal</span>
            </span>
          </li>
        ))}
      </ul>

      <Link
        href={logHref}
        className="focus-ring tap-target mt-4 inline-flex min-h-[44px] cursor-pointer items-center gap-1 text-xs font-bold text-signal-deep underline decoration-accent-secondary/30 underline-offset-4 transition-colors duration-200 hover:text-foreground"
      >
        Log another meal
        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </MotionBento>
  );
}

"use client";

import { AlertTriangle, Check } from "lucide-react";

type Props = {
  weekdayAvgKcal: number;
  weekendAvgKcal: number;
};

export function WeekendDriftSummary({ weekdayAvgKcal, weekendAvgKcal }: Props) {
  const diff = weekendAvgKcal - weekdayAvgKcal;
  const elevated = Math.abs(diff) > 200;

  return (
    <div className="border-t border-black/10 pt-6">
      <p className="mb-3 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
        Weekend vs weekday
      </p>
      <p className="font-mono text-sm leading-relaxed text-foreground">
        Weekdays{" "}
        <span className="font-black tabular-nums">{Math.round(weekdayAvgKcal)}</span> kcal ·
        Weekends{" "}
        <span className="font-black tabular-nums">{Math.round(weekendAvgKcal)}</span> kcal
        <span className="text-zinc-600">
          {" "}
          ({diff > 0 ? "+" : ""}
          {Math.round(diff)} kcal)
        </span>
      </p>
      {elevated ? (
        <p className="mt-3 flex items-start gap-2 text-xs font-medium leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Weekend average is more than 200 kcal above weekdays.
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-xs font-medium leading-relaxed text-signal-deep">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          Weekend intake is close to your weekday average.
        </p>
      )}
    </div>
  );
}


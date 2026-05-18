"use client";

import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { logHrefForDateKey } from "@/lib/meals/log-href";
import { dash } from "@/lib/ui/dashboard-tokens";

type Props = {
  selectedDateKey: string;
};

export function TodayEmptyDayPrompt({ selectedDateKey }: Props) {
  const logHref = logHrefForDateKey(selectedDateKey);

  return (
    <Link
      href={logHref}
      className="focus-ring tap-target group flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-dashed border-accent-secondary/35 bg-protein-tint/60 px-5 py-4 transition-[border-color,background-color] duration-200 hover:border-accent-secondary/50 hover:bg-protein-tint"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-secondary/15 text-signal-deep ring-1 ring-accent-secondary/20">
          <UtensilsCrossed className="h-5 w-5" strokeWidth={2.2} aria-hidden />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-foreground">No meals logged yet</p>
          <p className="text-xs font-medium text-zinc-600">
            Open the logger to describe food, scan a barcode, or log water.
          </p>
        </div>
      </div>
      <span className="shrink-0 rounded-xl bg-foreground px-3 py-2 text-[11px] font-black text-white transition-colors duration-200 group-hover:bg-accent-hover">
        Log meal
      </span>
    </Link>
  );
}

"use client";

import Link from "next/link";
import { todayPageSubtitle } from "@/lib/meals/local-date";
import { logHrefForDateKey } from "@/lib/meals/log-href";
import { Plus } from "lucide-react";
import { dash } from "@/lib/ui/dashboard-tokens";

type Props = {
  selectedDateKey: string;
};

export { logHrefForDateKey } from "@/lib/meals/log-href";

export function TodayPageHeader({ selectedDateKey }: Props) {
  const subtitle = todayPageSubtitle(selectedDateKey);
  const logHref = logHrefForDateKey(selectedDateKey);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={dash.labelEyebrow}>Dashboard</p>
        <h1 className="font-mono text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Today
        </h1>
        <p className="mt-1 text-sm font-semibold text-zinc-600">{subtitle}</p>
      </div>
      <Link
        href={logHref}
        className="btn-primary focus-ring tap-target inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 self-start px-5 py-3 text-sm sm:self-auto"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Log meal
      </Link>
    </header>
  );
}

"use client";

import Link from "next/link";
import { HISTORY_INSIGHT_ANCHORS as A } from "@/lib/meals/history-insight-anchors";

const linkClass =
  "cursor-pointer rounded-sm font-bold text-zinc-500 underline decoration-white/15 underline-offset-[3px] transition-colors duration-200 hover:text-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

type Variant = "rolling-week" | "week-recap" | "fortnight" | "month";

export function HistoryInsightsCrossLinks({ variant }: { variant: Variant }) {
  return (
    <nav
      className="mt-6 border-t border-white/5 pt-4"
      aria-label="Jump to other history insight sections"
    >
      {variant === "rolling-week" ? (
        <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
          Also on this page:{" "}
          <Link href={`#${A.weekRecap}`} className={linkClass}>
            Week recap
          </Link>
          <span className="text-zinc-700"> · </span>
          <Link href={`#${A.fortnight}`} className={linkClass}>
            Last 14 days
          </Link>
          <span className="text-zinc-700"> · </span>
          <Link href={`#${A.month}`} className={linkClass}>
            Month
          </Link>
        </p>
      ) : null}
      {variant === "week-recap" ? (
        <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
          Same 7-day window as{" "}
          <Link href={`#${A.rollingWeek}`} className={linkClass}>
            Rolling week
          </Link>
          . Broader:{" "}
          <Link href={`#${A.fortnight}`} className={linkClass}>
            14 days
          </Link>
          <span className="text-zinc-700"> · </span>
          <Link href={`#${A.month}`} className={linkClass}>
            Month
          </Link>
        </p>
      ) : null}
      {variant === "fortnight" ? (
        <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
          Tighter views:{" "}
          <Link href={`#${A.rollingWeek}`} className={linkClass}>
            7-day
          </Link>
          <span className="text-zinc-700"> · </span>
          <Link href={`#${A.weekRecap}`} className={linkClass}>
            Recap
          </Link>
          . Wider:{" "}
          <Link href={`#${A.month}`} className={linkClass}>
            Calendar month
          </Link>
        </p>
      ) : null}
      {variant === "month" ? (
        <p className="text-[10px] font-medium leading-relaxed text-zinc-600">
          Rolling windows above:{" "}
          <Link href={`#${A.rollingWeek}`} className={linkClass}>
            7-day summary
          </Link>
          <span className="text-zinc-700"> · </span>
          <Link href={`#${A.weekRecap}`} className={linkClass}>
            Week recap
          </Link>
          <span className="text-zinc-700"> · </span>
          <Link href={`#${A.fortnight}`} className={linkClass}>
            14 days
          </Link>
        </p>
      ) : null}
    </nav>
  );
}

"use client";

import { useId, useMemo } from "react";
import type { WeightTrendPoint } from "@/lib/body/weight-trend-series";
import {
  type UnitSystem,
  kgToLbs,
  getWeightLabel,
} from "@/lib/profile/units";

type Props = {
  points: WeightTrendPoint[];
  unitSystem: UnitSystem;
  variant: "compact" | "panel";
  className?: string;
  /** Goal weight in kg; horizontal reference line when in range */
  goalWeightKg?: number | null;
};

function toDisplay(kg: number, unitSystem: UnitSystem): number {
  return unitSystem === "imperial" ? kgToLbs(kg) : kg;
}

const W = 320;

export function WeightTrendSparkline({
  points,
  unitSystem,
  variant,
  className = "",
  goalWeightKg = null,
}: Props) {
  const gradId = useId().replace(/:/g, "");
  const layout = useMemo(() => {
    if (points.length < 2) return null;

    const smoothed = points.map((p) => toDisplay(p.smoothedKg, unitSystem));
    const raw = points.map((p) => toDisplay(p.rawKg, unitSystem));
    let min = Math.min(...smoothed, ...raw);
    let max = Math.max(...smoothed, ...raw);
    const goalDisplay =
      goalWeightKg != null &&
      Number.isFinite(goalWeightKg) &&
      goalWeightKg > 0
        ? toDisplay(goalWeightKg, unitSystem)
        : null;
    if (goalDisplay != null) {
      min = Math.min(min, goalDisplay);
      max = Math.max(max, goalDisplay);
    }
    if (min === max) {
      min -= 0.5;
      max += 0.5;
    }
    const span = max - min;
    const pad = span * 0.08 || 0.1;
    min -= pad;
    max += pad;

    const h = variant === "compact" ? 48 : 112;
    const padX = 6;
    const padY = variant === "compact" ? 6 : 14;
    const innerW = W - padX * 2;
    const innerH = h - padY * 2;
    const n = smoothed.length;

    const xAt = (i: number) =>
      padX + (n <= 1 ? innerW / 2 : (innerW * i) / (n - 1));
    const yAt = (v: number) =>
      padY + innerH * (1 - (v - min) / (max - min));

    let pathD = "";
    for (let i = 0; i < n; i++) {
      const x = xAt(i);
      const y = yAt(smoothed[i]);
      pathD += `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)} `;
    }

    const firstX = xAt(0);
    const lastX = xAt(n - 1);
    const bottom = h - padY;
    const areaD = `${pathD.trim()} L ${lastX.toFixed(2)} ${bottom.toFixed(2)} L ${firstX.toFixed(2)} ${bottom.toFixed(2)} Z`;

    const coords = points.map((_, i) => ({
      x: xAt(i),
      y: yAt(smoothed[i]),
    }));

    const fmt = (v: number) => v.toFixed(1);
    const goalY =
      goalDisplay != null ? yAt(goalDisplay) : null;
    return {
      h,
      pathD: pathD.trim(),
      areaD,
      coords,
      firstLabel: fmt(smoothed[0]),
      lastLabel: fmt(smoothed[n - 1]),
      firstDate: points[0].dateKey,
      lastDate: points[n - 1].dateKey,
      goalY,
      goalLabel: goalDisplay != null ? fmt(goalDisplay) : null,
    };
  }, [points, unitSystem, variant, goalWeightKg]);

  if (points.length < 2) {
    return (
      <p className="text-[10px] font-medium text-zinc-600">
        Log weight on two or more days to see a smoothed trend.
      </p>
    );
  }

  if (!layout) return null;

  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${layout.h}`}
        className="h-auto w-full text-violet-400"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(167, 139, 250)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="rgb(24, 24, 27)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={layout.areaD} fill={`url(#${gradId})`} stroke="none" />
        {layout.goalY != null && (
          <line
            x1={6}
            y1={layout.goalY}
            x2={W - 6}
            y2={layout.goalY}
            stroke="rgb(52 211 153)"
            strokeOpacity={0.45}
            strokeWidth={variant === "compact" ? 1.25 : 1.5}
            strokeDasharray="5 5"
          />
        )}
        <path
          d={layout.pathD}
          fill="none"
          stroke="currentColor"
          strokeWidth={variant === "compact" ? 2 : 2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-violet-400/90"
        />
        {variant === "panel" &&
          layout.coords.map((c, i) => (
            <circle
              key={points[i].dateKey}
              cx={c.x}
              cy={c.y}
              r={2.25}
              className="text-violet-300/35"
              fill="currentColor"
            />
          ))}
      </svg>
      {variant === "panel" && (
        <div className="mt-2 grid grid-cols-1 gap-1 text-[10px] font-bold text-zinc-500 sm:grid-cols-3 sm:items-center sm:gap-2">
          <span className="text-left sm:col-start-1">
            {layout.firstDate}{" "}
            <span className="text-zinc-400">{layout.firstLabel}</span>{" "}
            {getWeightLabel(unitSystem)}
          </span>
          {layout.goalLabel != null ? (
            <span className="text-center text-emerald-400/80 sm:col-start-2">
              Goal {layout.goalLabel} {getWeightLabel(unitSystem)}
            </span>
          ) : (
            <span className="hidden sm:col-start-2 sm:block" aria-hidden />
          )}
          <span className="text-left sm:col-start-3 sm:text-right">
            {layout.lastDate}{" "}
            <span className="text-violet-300/90">{layout.lastLabel}</span>{" "}
            {getWeightLabel(unitSystem)}
          </span>
        </div>
      )}
    </div>
  );
}

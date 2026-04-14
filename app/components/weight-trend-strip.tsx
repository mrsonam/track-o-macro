"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { WeightTrendPoint } from "@/lib/body/weight-trend-series";
import { WeightTrendSparkline } from "@/app/components/weight-trend-sparkline";
import { type UnitSystem } from "@/lib/profile/units";
import { Scale, Info } from "lucide-react";

type Props = {
  unitSystem: UnitSystem;
  className?: string;
};

export function WeightTrendStrip({ unitSystem, className = "" }: Props) {
  const [points, setPoints] = useState<WeightTrendPoint[] | null>(null);
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const q = new URLSearchParams({
        timeZone,
        days: "150",
      });
      const res = await fetch(`/api/body/weight-series?${q}`, {
        credentials: "same-origin",
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        points?: WeightTrendPoint[];
        goalWeightKg?: unknown;
      };
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not load");
        setPoints(null);
        setGoalWeightKg(null);
        return;
      }
      setPoints(Array.isArray(json.points) ? json.points : []);
      const g = Number(json.goalWeightKg);
      setGoalWeightKg(Number.isFinite(g) && g > 0 ? g : null);
    } catch {
      setError("Network error");
      setPoints(null);
      setGoalWeightKg(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div
      className={`bento-card scroll-mt-28 border-white/5 bg-zinc-900/40 p-6 lg:p-8 ${className}`}
    >
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
          <Scale className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="trends-weight-trend"
            className="text-sm font-black uppercase tracking-widest text-white"
          >
            Weight trajectory
          </h2>
          <p className="mt-1 text-xs font-medium leading-relaxed text-zinc-500">
            Daily weights collapsed to one value per day; curve is EMA-smoothed to
            dampen noise. Set an optional{" "}
            <Link
              href="/settings"
              className="text-violet-400/90 underline-offset-2 hover:underline"
            >
              target weight
            </Link>{" "}
            for a reference line.{" "}
            <Link
              href="/settings"
              className="text-violet-400/90 underline-offset-2 hover:underline"
            >
              Home sparkline
            </Link>{" "}
            is optional.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="text-xs font-bold text-zinc-600">Loading scale history…</p>
      ) : error ? (
        <p className="text-xs font-bold text-red-400/80" role="alert">
          {error}
        </p>
      ) : points && points.length >= 2 ? (
        <WeightTrendSparkline
          points={points}
          unitSystem={unitSystem}
          variant="panel"
          goalWeightKg={goalWeightKg}
        />
      ) : (
        <div className="flex items-start gap-2 rounded-xl border border-white/5 bg-zinc-950/50 p-4 text-xs font-medium text-zinc-500">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-zinc-600" aria-hidden />
          <span>
            Log your weight from the home screen on a few different days to see
            a smoothed trend here. This stays off the main dashboard unless you
            enable the compact sparkline in settings.
          </span>
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  localDayBoundsIsoFromYmd,
  dayHeadingLabel,
  formatLocalYmd,
} from "@/lib/meals/local-date";
import type { UnitSystem } from "@/lib/profile/units";
import { Droplets, Sparkles, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

type FluidEntry = {
  id: string;
  volume_ml: number;
  kind: string | null;
  note: string | null;
  loggedAt: string;
};

type Props = {
  dateKey: string;
  unitSystem: UnitSystem;
};

const KIND_OPTIONS = [
  { id: "water", label: "Water" },
  { id: "tea", label: "Tea" },
  { id: "coffee", label: "Coffee" },
  { id: "juice", label: "Juice" },
  { id: "other", label: "Other" },
] as const;

const KIND_LABEL = Object.fromEntries(
  KIND_OPTIONS.map((o) => [o.id, o.label]),
) as Record<string, string>;

function formatVolume(ml: number, unit: UnitSystem) {
  if (unit === "imperial") {
    const flOz = ml / 29.5735;
    return `${Math.round(flOz * 10) / 10} fl oz`;
  }
  return `${Math.round(ml)} ml`;
}

function quickAddPresets(unit: UnitSystem): { ml: number; label: string }[] {
  if (unit === "imperial") {
    return [
      { ml: 237, label: "8 fl oz" },
      { ml: 473, label: "16 fl oz" },
      { ml: 710, label: "24 fl oz" },
    ];
  }
  return [
    { ml: 250, label: "250 ml" },
    { ml: 500, label: "500 ml" },
    { ml: 750, label: "750 ml" },
  ];
}

function progressHint(
  totalMl: number,
  targetMl: number,
  unit: UnitSystem,
): string | null {
  if (targetMl <= 0) return null;
  if (totalMl >= targetMl) {
    const over = totalMl - targetMl;
    if (over < 1) return "Right on your fluid goal for this day.";
    return `${formatVolume(over, unit)} above goal — totally fine.`;
  }
  const gap = targetMl - totalMl;
  return `${formatVolume(gap, unit)} to your goal`;
}

export function HydrationCard({ dateKey, unitSystem }: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetMl, setTargetMl] = useState(2000);
  const [totalMl, setTotalMl] = useState(0);
  const [logs, setLogs] = useState<FluidEntry[]>([]);
  const [kind, setKind] = useState<(typeof KIND_OPTIONS)[number]["id"]>("water");
  const [customMl, setCustomMl] = useState("");
  const [busy, setBusy] = useState(false);

  const isToday = useMemo(
    () => dateKey === formatLocalYmd(new Date()),
    [dateKey],
  );

  const presets = useMemo(() => quickAddPresets(unitSystem), [unitSystem]);

  const load = useCallback(async () => {
    setError(null);
    const { fromIso, toIso } = localDayBoundsIsoFromYmd(dateKey);
    try {
      const res = await fetch(
        `/api/body/fluids?from=${encodeURIComponent(fromIso)}&to=${encodeURIComponent(toIso)}`,
      );
      const json = (await res.json()) as {
        error?: string;
        targetMl?: number;
        totalMl?: number;
        logs?: FluidEntry[];
      };
      if (!res.ok) {
        setError(json.error ?? "Could not load fluids");
        return;
      }
      if (json.targetMl != null) setTargetMl(json.targetMl);
      setTotalMl(json.totalMl ?? 0);
      setLogs(Array.isArray(json.logs) ? json.logs : []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [dateKey]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const ratio = targetMl > 0 ? Math.min(1, totalMl / targetMl) : 0;
  const pctDisplay =
    targetMl > 0 ? Math.min(999, Math.round((totalMl / targetMl) * 100)) : 0;
  const heading = dayHeadingLabel(dateKey);
  const hint = progressHint(totalMl, targetMl, unitSystem);

  async function addFluid(volumeMl: number) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/body/fluids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volumeMl, kind }),
      });
      const json = (await res.json()) as {
        error?: string;
        log?: FluidEntry;
      };
      if (!res.ok) {
        setError(json.error ?? "Could not log");
        await load();
        return;
      }
      if (json.log) {
        setLogs((prev) => [json.log!, ...prev]);
        setTotalMl((prev) =>
          Math.round((prev + volumeMl) * 10) / 10,
        );
      } else {
        await load();
      }
    } catch {
      setError("Network error");
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function removeFluid(id: string) {
    const snapshot = { logs, totalMl };
    const entry = logs.find((l) => l.id === id);
    setBusy(true);
    setError(null);
    if (entry) {
      setLogs((prev) => prev.filter((l) => l.id !== id));
      setTotalMl((prev) =>
        Math.max(0, Math.round((prev - entry.volume_ml) * 10) / 10),
      );
    }
    try {
      const res = await fetch(`/api/body/fluids/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? "Could not remove");
        setLogs(snapshot.logs);
        setTotalMl(snapshot.totalMl);
        return;
      }
    } catch {
      setError("Network error");
      setLogs(snapshot.logs);
      setTotalMl(snapshot.totalMl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bento-card relative overflow-hidden border border-sky-500/10 bg-gradient-to-br from-zinc-900/50 via-zinc-900/40 to-sky-950/20 p-6">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-sky-500/10 blur-3xl"
        aria-hidden
      />
      <div className="relative">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/15 text-sky-400 ring-1 ring-sky-500/20">
              <Droplets className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                  Hydration
                </p>
                {isToday ? (
                  <span className="rounded-md bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-sky-400/90">
                    Today
                  </span>
                ) : (
                  <span className="rounded-md bg-zinc-800 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-zinc-500">
                    Past day
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-zinc-400">{heading}</p>
            </div>
          </div>
        </div>

        {error ? (
          <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-xs font-bold text-red-400/90">
            {error}
          </p>
        ) : null}

        {loading ? (
          <div className="space-y-4" aria-busy="true" aria-label="Loading hydration">
            <div className="h-9 w-40 rounded-lg bg-zinc-800/80" />
            <div className="h-2.5 w-full rounded-full bg-zinc-800/80" />
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-9 w-16 rounded-xl bg-zinc-800/70" />
              ))}
            </div>
            <div className="flex gap-2">
              <div className="h-10 flex-1 rounded-xl bg-zinc-800/70" />
              <div className="h-10 w-20 rounded-xl bg-zinc-800/70" />
            </div>
          </div>
        ) : (
          <>
            <div
              className="mb-5"
              role="group"
              aria-label="Fluid progress for this day"
            >
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p
                    className="text-[10px] font-bold uppercase tracking-wider text-zinc-500"
                    id="hydration-total-label"
                  >
                    Logged
                  </p>
                  <p
                    className="text-3xl font-black tabular-nums tracking-tight text-white"
                    aria-live="polite"
                    aria-labelledby="hydration-total-label"
                  >
                    {formatVolume(totalMl, unitSystem)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                    Goal
                  </p>
                  <p className="text-sm font-bold tabular-nums text-zinc-300">
                    {formatVolume(targetMl, unitSystem)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-sky-400/90">
                    {pctDisplay}%
                  </p>
                </div>
              </div>

              <div
                className="relative h-3 w-full overflow-hidden rounded-full border border-white/5 bg-zinc-950/80 shadow-inner"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, pctDisplay)}
                aria-label="Progress toward fluid goal"
              >
                <motion.div
                  className={`h-full rounded-full ${
                    ratio >= 1
                      ? "bg-gradient-to-r from-emerald-600 via-sky-500 to-sky-400"
                      : "bg-gradient-to-r from-sky-700 via-sky-500 to-sky-400"
                  }`}
                  initial={false}
                  animate={{ width: `${Math.min(100, Math.round(ratio * 100))}%` }}
                  transition={{ type: "spring", stiffness: 120, damping: 18 }}
                />
                {ratio >= 1 ? (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white/40" aria-hidden />
                  </div>
                ) : null}
              </div>

              {hint ? (
                <p className="mt-2 text-[11px] font-medium leading-relaxed text-zinc-500">
                  {hint}
                </p>
              ) : null}
            </div>

            <div className="mb-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                Type
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="radiogroup"
                aria-label="Beverage type"
              >
                {KIND_OPTIONS.map((o) => {
                  const active = kind === o.id;
                  return (
                    <button
                      key={o.id}
                      type="button"
                      disabled={busy}
                      role="radio"
                      aria-checked={active}
                      onClick={() => setKind(o.id)}
                      className={`focus-ring tap-target rounded-xl px-3 py-2 text-[11px] font-bold transition-[transform,background-color,color,box-shadow] duration-200 active:scale-[0.98] disabled:opacity-40 ${
                        active
                          ? "bg-sky-500/25 text-sky-100 shadow-[0_0_0_1px_rgba(56,189,248,0.35)]"
                          : "border border-white/5 bg-zinc-950 text-zinc-500 hover:border-white/10 hover:bg-zinc-900 hover:text-zinc-300"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                Quick add
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.ml}
                    type="button"
                    disabled={busy}
                    onClick={() => void addFluid(p.ml)}
                    className="focus-ring tap-target flex min-h-[44px] flex-col items-center justify-center rounded-xl border border-sky-500/20 bg-sky-500/10 px-3 py-2 text-center transition-[transform,background-color,border-color] duration-200 hover:border-sky-400/40 hover:bg-sky-500/20 active:scale-[0.98] disabled:opacity-40"
                  >
                    <span className="text-[12px] font-bold text-sky-100">
                      +{p.label}
                    </span>
                    {unitSystem === "imperial" ? (
                      <span className="text-[9px] font-medium text-sky-500/70">
                        {p.ml} ml
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <form
              className="mb-5 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(customMl, 10);
                if (Number.isNaN(n) || n < 1 || n > 5000) return;
                setCustomMl("");
                void addFluid(n);
              }}
            >
              <label className="sr-only" htmlFor="hydration-custom-ml">
                Custom amount in milliliters
              </label>
              <input
                id="hydration-custom-ml"
                type="number"
                inputMode="numeric"
                min={1}
                max={5000}
                placeholder={
                  unitSystem === "imperial"
                    ? "Custom ml (e.g. 355)"
                    : "Custom ml"
                }
                value={customMl}
                disabled={busy}
                onChange={(e) => setCustomMl(e.target.value)}
                className="form-field min-h-[44px] min-w-0 flex-1 py-2.5 text-sm"
              />
              <button
                type="submit"
                disabled={busy || !customMl.trim()}
                className="focus-ring tap-target min-h-[44px] shrink-0 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-sky-500 disabled:opacity-40"
              >
                Add
              </button>
            </form>

            <div className="mb-1">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                Today&apos;s drinks
              </p>
              {logs.length > 0 ? (
                <ul className="max-h-44 space-y-2 overflow-y-auto overscroll-contain pr-1">
                  <AnimatePresence initial={false}>
                    {logs.map((l) => (
                      <motion.li
                        key={l.id}
                        layout
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 8 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-zinc-950/60 px-3 py-2.5 text-xs"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-zinc-200">
                            +{Math.round(l.volume_ml)} ml
                            <span className="ml-1.5 font-medium text-zinc-500">
                              ·{" "}
                              {l.kind
                                ? KIND_LABEL[l.kind] ?? l.kind
                                : "Unspecified"}
                            </span>
                          </p>
                          {l.note ? (
                            <p className="truncate text-[10px] text-zinc-600">
                              {l.note}
                            </p>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void removeFluid(l.id)}
                          className="focus-ring tap-target shrink-0 rounded-lg p-2 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400"
                          aria-label={`Remove ${Math.round(l.volume_ml)} ml drink`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/40 px-4 py-6 text-center">
                  <Droplets
                    className="mx-auto mb-2 h-8 w-8 text-zinc-700"
                    strokeWidth={1.5}
                  />
                  <p className="text-xs font-semibold text-zinc-400">
                    No drinks logged for this day
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-600">
                    Tap quick add or enter a custom amount — type is optional but
                    helps your log read clearly.
                  </p>
                </div>
              )}
            </div>

            <p className="mt-4 border-t border-white/5 pt-4 text-[10px] leading-relaxed text-zinc-600">
              Wellness tracking only, not medical advice. Change your default
              goal in Settings.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

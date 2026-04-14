"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";
import { 
  Scale, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  LineChart,
  Plus,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  type UnitSystem,
  kgToLbs,
  lbsToKg,
  getWeightLabel,
} from "@/lib/profile/units";
import type { WeightTrendPoint } from "@/lib/body/weight-trend-series";
import { WeightTrendSparkline } from "@/app/components/weight-trend-sparkline";

type WeightLog = {
  id: string;
  weightKg: string | number;
  bodyFatPct: string | number | null;
  loggedAt: string;
};

type Props = {
  unitSystem: UnitSystem;
  /** Epic 6 — compact smoothed sparkline (off by default; main chart is on /trends) */
  weightTrendOnHomeEnabled?: boolean;
};

export function WeightLogCard({
  unitSystem,
  weightTrendOnHomeEnabled = false,
}: Props) {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [bfInputValue, setBfInputValue] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendPoints, setTrendPoints] = useState<WeightTrendPoint[] | null>(
    null,
  );
  const [goalWeightKg, setGoalWeightKg] = useState<number | null>(null);

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/body/weight");
        const data = await res.json();
        if (res.ok) {
          setLogs(data.logs);
        }
      } catch (e) {
        console.error("Failed to fetch weight logs", e);
      } finally {
        setLoading(false);
      }
    }
    fetchLogs();
  }, []);

  useEffect(() => {
    if (!weightTrendOnHomeEnabled) {
      setTrendPoints(null);
      return;
    }
    let cancelled = false;
    async function loadTrend() {
      try {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const q = new URLSearchParams({ timeZone, days: "90" });
        const res = await fetch(`/api/body/weight-series?${q}`, {
          credentials: "same-origin",
        });
        const json = (await res.json().catch(() => ({}))) as {
          points?: WeightTrendPoint[];
          goalWeightKg?: unknown;
        };
        if (!cancelled && res.ok && Array.isArray(json.points)) {
          setTrendPoints(json.points);
          const g = Number(json.goalWeightKg);
          setGoalWeightKg(Number.isFinite(g) && g > 0 ? g : null);
        } else if (!cancelled) {
          setGoalWeightKg(null);
        }
      } catch {
        if (!cancelled) setTrendPoints(null);
      }
    }
    void loadTrend();
    return () => {
      cancelled = true;
    };
  }, [weightTrendOnHomeEnabled, logs]);

  const latestLog = logs[0];
  const previousLog = logs[1];

  const currentWeightRaw = latestLog ? Number(latestLog.weightKg) : null;
  const previousWeightRaw = previousLog ? Number(previousLog.weightKg) : null;

  // Calculate 7-log Simple Moving Average (SMA)
  const trendWeightRaw = logs.length > 0
    ? logs.slice(0, 7).reduce((acc, log) => acc + Number(log.weightKg), 0) / Math.min(logs.length, 7)
    : null;

  // Convert for display
  const displayWeight = currentWeightRaw !== null 
    ? (unitSystem === "imperial" ? kgToLbs(currentWeightRaw) : currentWeightRaw)
    : null;

  const displayPrevWeight = previousWeightRaw !== null
    ? (unitSystem === "imperial" ? kgToLbs(previousWeightRaw) : previousWeightRaw)
    : null;

  const displayTrendWeight = trendWeightRaw !== null
    ? (unitSystem === "imperial" ? kgToLbs(trendWeightRaw) : trendWeightRaw)
    : null;

  const delta = (displayWeight !== null && displayPrevWeight !== null) 
    ? displayWeight - displayPrevWeight 
    : null;

  const trendDelta = (displayWeight !== null && displayTrendWeight !== null)
    ? displayWeight - displayTrendWeight
    : null;

  async function handleLogWeight(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(inputValue);
    const bfVal = bfInputValue ? parseFloat(bfInputValue) : null;
    
    if (isNaN(val) || val <= 0) return;

    setSaving(true);
    setError(null);

    // Convert to kg if imperial
    const weightKg = unitSystem === "imperial" ? lbsToKg(val) : val;

    try {
      const res = await fetch("/api/body/weight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          weightKg, 
          bodyFatPct: bfVal 
        }),
      });

      let data;
      try {
        data = await res.json();
      } catch {
        data = { error: "Server communication failure" };
      }

      if (res.ok) {
        setLogs([data.log, ...logs]);
        setInputValue("");
        setBfInputValue("");
        setShowInput(false);
      } else {
        setError(data.error ?? data.details ?? "Failed to archive log");
      }
    } catch (err) {
      console.error("Weight log submission error:", err);
      setError("Cloud sync failure. Check connection.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card border border-white/5 bg-zinc-900/40 p-6 overflow-hidden relative"
    >
       {/* Background Accent */}
       <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Body Composition</h3>
            <p className="text-[10px] font-bold text-zinc-500">{unitSystem === "imperial" ? "Imperial" : "Metric"} Registry Active</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowInput(!showInput)}
          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
            showInput ? "bg-zinc-800 text-white" : "bg-white/5 text-zinc-400 hover:bg-white/10"
          }`}
        >
          <Plus className={`h-4 w-4 transition-transform ${showInput ? "rotate-45" : ""}`} />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showInput ? (
          <motion.form 
            key="input"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleLogWeight}
            className="mb-6 overflow-hidden space-y-3"
          >
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  autoFocus
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder={`Weight (${getWeightLabel(unitSystem)})`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-white focus:border-violet-500 outline-none h-12"
                />
              </div>
              <div className="relative w-32">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder="BF %"
                  value={bfInputValue}
                  onChange={(e) => setBfInputValue(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 text-white focus:border-violet-500 outline-none h-12"
                />
              </div>
            </div>
            
            <button 
              disabled={saving || !inputValue}
              className="w-full h-12 rounded-xl bg-violet-500 text-white font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
            >
              {saving ? <Zap className="h-4 w-4 animate-spin mx-auto" /> : "Registry Log Entry"}
            </button>
            {error && <p className="mt-2 text-[10px] font-bold text-red-500">{error}</p>}
          </motion.form>
        ) : (
          <motion.div key="display" className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-3">
                <div className="text-4xl font-black text-white tracking-tighter">
                  {displayWeight !== null ? displayWeight.toFixed(1) : "—"}
                  <span className="text-lg font-medium text-zinc-600 ml-1.5">{getWeightLabel(unitSystem)}</span>
                </div>
                
                {delta !== null && delta !== 0 && (
                  <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 mb-2 text-[10px] font-black border ${
                    delta > 0 
                    ? "bg-red-500/10 border-red-500/20 text-red-500" 
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  }`}>
                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                  </div>
                )}
              </div>

              {latestLog?.bodyFatPct && (
                <div className="mb-2 text-right">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] mb-0.5">Adipose</p>
                  <p className="text-sm font-black text-violet-400">{Number(latestLog.bodyFatPct).toFixed(1)}%</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                {weightTrendOnHomeEnabled &&
                trendPoints &&
                trendPoints.length >= 2 ? (
                  <div className="min-w-0 flex-1">
                    <WeightTrendSparkline
                      points={trendPoints}
                      unitSystem={unitSystem}
                      variant="compact"
                      goalWeightKg={goalWeightKg}
                    />
                  </div>
                ) : (
                  <div className="flex-1 h-3 rounded-full border border-white/5 bg-zinc-950 p-0.5">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-violet-500/20 via-violet-500 to-violet-500/20" />
                  </div>
                )}
                <div className="flex shrink-0 flex-col items-end">
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">
                    <LineChart className="h-3 w-3" /> Trend Weight
                  </span>
                  <span className="text-xs font-black text-violet-200">
                    {displayTrendWeight !== null
                      ? displayTrendWeight.toFixed(1)
                      : "—"}{" "}
                    {getWeightLabel(unitSystem)}
                  </span>
                </div>
              </div>
              {weightTrendOnHomeEnabled &&
                trendPoints &&
                trendPoints.length >= 2 && (
                  <Link
                    href={`/trends#${HISTORY_INSIGHT_ANCHORS.weightTrend}`}
                    className="inline-block text-[9px] font-bold uppercase tracking-widest text-zinc-600 transition-colors hover:text-violet-400/90"
                  >
                    Full chart → Trends
                  </Link>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showInput && logs.length > 0 && (
        <div className="mt-6 pt-4 border-t border-white/5">
          <p className="text-[10px] font-black uppercase text-zinc-700 tracking-widest mb-3">Recent Logs</p>
          <div className="space-y-2">
            {logs.slice(0, 3).map((l) => {
              const weight = unitSystem === "imperial" ? kgToLbs(Number(l.weightKg)) : Number(l.weightKg);
              return (
                <div key={l.id} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-800 group-hover:bg-violet-500 transition-colors" />
                    <span className="text-xs text-zinc-400 font-medium">
                      {new Date(l.loggedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {l.bodyFatPct && (
                      <span className="text-[9px] font-bold text-violet-500/40 uppercase">BF: {Number(l.bodyFatPct).toFixed(1)}%</span>
                    )}
                    <span className="text-xs font-bold text-zinc-200">
                      {weight.toFixed(1)} {getWeightLabel(unitSystem)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </motion.div>
  );
}

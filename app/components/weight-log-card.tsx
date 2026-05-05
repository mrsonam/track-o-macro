"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TRENDS_INSIGHT_ANCHORS } from "@/lib/meals/trends-insight-anchors";
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
import { useMealsSyncTick } from "@/lib/meals/use-meals-sync-tick";

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
  const syncTick = useMealsSyncTick();

  useEffect(() => {
    async function fetchLogs() {
      try {
        const res = await fetch("/api/body/weight", {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => ({}))) as {
          logs?: WeightLog[];
        };
        if (res.ok && Array.isArray(data.logs)) {
          setLogs(data.logs);
        }
      } catch (e) {
        console.error("Failed to fetch weight logs", e);
      } finally {
        setLoading(false);
      }
    }
    void fetchLogs();
  }, [syncTick]);

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
      className="bento-card relative overflow-hidden border border-black/10 bg-[#f7f3e9] p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eaf7df] text-[#4f9d45]">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-black uppercase tracking-tight text-[#171412]">Body Composition</h3>
            <p className="text-[10px] font-bold text-[#6d6251]">{unitSystem === "imperial" ? "Imperial" : "Metric"} registry active</p>
          </div>
        </div>
        
        <button 
          onClick={() => setShowInput(!showInput)}
          className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
            showInput ? "bg-[#171412] text-white" : "bg-white/55 text-[#171412] hover:bg-white/80"
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
                  className="h-12 w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-[#171412] outline-none focus:border-[#4f9d45]"
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
                  className="h-12 w-full rounded-xl border border-black/10 bg-white/80 px-4 py-3 text-[#171412] outline-none focus:border-[#4f9d45]"
                />
              </div>
            </div>
            
            <button 
              disabled={saving || !inputValue}
              className="h-12 w-full rounded-xl bg-[#171412] text-[10px] font-black uppercase tracking-widest text-white disabled:opacity-50"
            >
              {saving ? <Zap className="h-4 w-4 animate-spin mx-auto" /> : "Registry Log Entry"}
            </button>
            {error && <p className="mt-2 text-[10px] font-bold text-red-500">{error}</p>}
          </motion.form>
        ) : (
          <motion.div key="display" className="space-y-4">
            <div className="flex items-end justify-between">
              <div className="flex items-end gap-3">
                <div className="font-mono text-4xl font-black tracking-tighter text-[#171412]">
                  {displayWeight !== null ? displayWeight.toFixed(1) : "—"}
                  <span className="ml-1.5 text-lg font-medium text-[#6d6251]">{getWeightLabel(unitSystem)}</span>
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
                  <p className="mb-0.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#6d6251]">Adipose</p>
                  <p className="font-mono text-sm font-black text-[#171412]">{Number(latestLog.bodyFatPct).toFixed(1)}%</p>
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
                    <div className="h-3 flex-1 rounded-full border border-black/10 bg-white/65 p-0.5">
                    <div className="h-full w-full rounded-full bg-gradient-to-r from-[#4f9d45]/20 via-[#4f9d45] to-[#4f9d45]/20" />
                  </div>
                )}
                <div className="flex shrink-0 flex-col items-end">
                  <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-[#6d6251]">
                    <LineChart className="h-3 w-3" /> Trend Weight
                  </span>
                  <span className="font-mono text-xs font-black text-[#171412]">
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
                    href={`/trends#${TRENDS_INSIGHT_ANCHORS.weightTrend}`}
                    className="inline-block text-[9px] font-bold uppercase tracking-widest text-[#6d6251] transition-colors hover:text-[#171412]"
                  >
                    Full chart → Trends
                  </Link>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {!showInput && logs.length > 0 && (
        <div className="mt-6 border-t border-black/10 pt-4">
          <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-[#6d6251]">Recent Logs</p>
          <div className="space-y-2">
            {logs.slice(0, 3).map((l) => {
              const weight = unitSystem === "imperial" ? kgToLbs(Number(l.weightKg)) : Number(l.weightKg);
              return (
                <div key={l.id} className="flex items-center justify-between group cursor-default">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#171412]/25 transition-colors group-hover:bg-[#171412]" />
                    <span className="text-xs font-medium text-[#6d6251]">
                      {new Date(l.loggedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {l.bodyFatPct && (
                      <span className="text-[9px] font-bold uppercase text-[#6d6251]/70">BF: {Number(l.bodyFatPct).toFixed(1)}%</span>
                    )}
                    <span className="font-mono text-xs font-bold text-[#171412]">
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

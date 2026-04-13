"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, RefreshCw, CheckCircle2, AlertCircle, Info, TrendingDown, TrendingUp } from "lucide-react";

interface MetabolicData {
  adaptiveTDEE: number | null;
  confidenceScore: number;
  weightDeltaKg: number | null;
  averageIntake: number | null;
  daysAnalyzed: number;
  currentTargetKcal: number | null;
  goalIntent: "lose" | "maintain" | "gain" | null;
  goalPace: "gentle" | "moderate" | "aggressive" | null;
}

export function AdaptiveTargetCard() {
  const [data, setData] = useState<MetabolicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchMetabolic() {
      try {
        const res = await fetch("/api/intelligence/metabolic");
        const json = await res.json();
        if (res.ok) {
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch metabolic data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMetabolic();
  }, []);

  const calculateRecommendedTarget = (tdee: number, intent: string, pace: string) => {
    if (intent === "maintain") return tdee;
    
    // Values from lib/nutrition/tdee.ts
    const deficits: Record<string, number> = { gentle: 250, moderate: 400, aggressive: 550 };
    const surpluses: Record<string, number> = { gentle: 200, moderate: 300, aggressive: 450 };

    if (intent === "lose") return Math.round(tdee - (deficits[pace] ?? 400));
    if (intent === "gain") return Math.round(tdee + (surpluses[pace] ?? 300));
    
    return tdee;
  };

  const handleSync = async () => {
    if (!data?.adaptiveTDEE) return;
    
    setSyncing(true);
    setError(null);
    
    const newTarget = calculateRecommendedTarget(
      data.adaptiveTDEE, 
      data.goalIntent ?? "maintain", 
      data.goalPace ?? "moderate"
    );

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetKcal: newTarget })
      });

      if (res.ok) {
        setSynced(true);
        setData(prev => prev ? { ...prev, currentTargetKcal: newTarget } : null);
        setTimeout(() => setSynced(false), 3000);
      } else {
        setError("Sync failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return (
    <div className="bento-card border border-white/5 bg-zinc-900/40 p-6 h-48 flex items-center justify-center">
      <Brain className="h-8 w-8 text-zinc-700" />
    </div>
  );

  if (!data || data.adaptiveTDEE === null) {
    return (
      <div className="bento-card border border-white/5 bg-zinc-900/40 p-6 overflow-hidden relative">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-emerald-500" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Metabolic Logic</h3>
        </div>
        <p className="text-xs text-zinc-500 leading-relaxed italic">
          Insufficient data points to compute baseline. Log food and weight for 7 consecutive days to activate adaptive monitoring.
        </p>
      </div>
    );
  }

  const recommendedTarget = calculateRecommendedTarget(
    data.adaptiveTDEE, 
    data.goalIntent ?? "maintain", 
    data.goalPace ?? "moderate"
  );

  const diff = Math.abs((data.currentTargetKcal ?? 0) - recommendedTarget);
  const needsSync = diff > 50; // Threshold for suggesting a sync

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bento-card border border-white/5 bg-zinc-900/40 p-6 overflow-hidden relative"
    >
      {/* Background Accent */}
      <div className="absolute -left-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
            <Brain className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Metabolic Logic</h3>
            <p className="text-xs font-medium text-zinc-600">Adaptive Feedback Loop</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            <span className="text-[9px] font-black uppercase tracking-tighter text-emerald-500">Live Engine</span>
          </div>
          <span className="text-[8px] text-zinc-600 mt-1 uppercase font-bold tracking-tight">Confidence: {Math.round(data.confidenceScore * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">True Maintenance</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-white">{data.adaptiveTDEE}</span>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">kcal</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Physiology Delta</p>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-black ${data.weightDeltaKg && data.weightDeltaKg > 0 ? "text-amber-500" : "text-emerald-500"}`}>
              {data.weightDeltaKg && data.weightDeltaKg > 0 ? "+" : ""}{data.weightDeltaKg?.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold text-zinc-600 uppercase">kg</span>
          </div>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-black/40 border border-white/5 relative group overflow-hidden">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Recommended Target</p>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white italic tracking-tight">{recommendedTarget} kcal</span>
              {needsSync && (
                <span className="text-[9px] font-bold text-emerald-500/80 uppercase tracking-tighter decoration-emerald-500/30 underline underline-offset-2">
                  Target Drift Detected
                </span>
              )}
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing || !needsSync || synced}
            className={`h-10 w-10 flex items-center justify-center rounded-lg transition-all ${
              synced 
                ? "bg-emerald-500 text-white" 
                : needsSync 
                  ? "bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20" 
                  : "bg-white/5 text-zinc-600 cursor-default"
            }`}
          >
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : synced ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        {needsSync && !synced && (
           <div className="absolute bottom-0 left-0 h-[1px] w-full bg-emerald-500/40" />
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-500">
          <AlertCircle className="h-3 w-3" />
          <span className="text-[9px] font-bold uppercase tracking-tight">{error}</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-white/5 flex items-start gap-2">
        <Info className="h-3 w-3 text-zinc-600 mt-0.5" />
        <p className="text-[9px] leading-tight text-zinc-500 italic">
          Your True Maintenance is calculated using a 14-day energy balance analysis. Unlike static formulas, this adjusts for metabolic adaptation and activity variance.
        </p>
      </div>
    </motion.div>
  );
}

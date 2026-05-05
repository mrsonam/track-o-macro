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
    if (!data) return;
    const tdee = data.adaptiveTDEE;
    if (tdee == null || tdee < 800) return;
    
    setSyncing(true);
    setError(null);
    
    const newTarget = calculateRecommendedTarget(
      tdee,
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
    <div className="bento-card flex h-48 items-center justify-center border border-[#4f9d45]/20 bg-[#eaf7df] p-6">
      <Brain className="h-8 w-8 text-[#4f9d45]" />
    </div>
  );

  if (!data || data.adaptiveTDEE === null || data.adaptiveTDEE < 800) {
    return (
      <div className="bento-card relative overflow-hidden border border-[#4f9d45]/20 bg-[#eaf7df] p-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="h-4 w-4 text-[#4f9d45]" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#356d30]">Metabolic Logic</h3>
        </div>
        <p className="text-xs leading-relaxed text-[#356d30]/80">
          Insufficient or noisy data to estimate maintenance (need consistent logs, or the model was capped). Keep logging intake and weight for a longer stretch.
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
      className="bento-card relative overflow-hidden border border-[#4f9d45]/20 bg-[#eaf7df] p-6"
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#4f9d45]/20 bg-white/60 text-[#4f9d45]">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#356d30]">Metabolic Logic</h3>
            <p className="text-xs font-semibold text-[#356d30]/70">Adaptive feedback loop</p>
          </div>
        </div>
        
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 rounded-full border border-[#4f9d45]/20 bg-white/60 px-2 py-0.5">
            <div className="h-1.5 w-1.5 rounded-full bg-[#4f9d45]" />
            <span className="text-[9px] font-black uppercase tracking-tighter text-[#356d30]">Live Engine</span>
          </div>
          <span className="mt-1 text-[8px] font-bold uppercase tracking-tight text-[#356d30]/70">Confidence: {Math.round(data.confidenceScore * 100)}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#356d30]/75">True Maintenance</p>
          <div className="flex items-baseline gap-1">
            <span className="font-mono text-2xl font-black text-[#171412]">{data.adaptiveTDEE}</span>
            <span className="text-[10px] font-bold uppercase text-[#356d30]/70">kcal</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-[#356d30]/75">Physiology Delta</p>
          <div className="flex items-baseline gap-1">
            <span className={`font-mono text-2xl font-black ${data.weightDeltaKg && data.weightDeltaKg > 0 ? "text-amber-700" : "text-[#4f9d45]"}`}>
              {data.weightDeltaKg && data.weightDeltaKg > 0 ? "+" : ""}{data.weightDeltaKg?.toFixed(2)}
            </span>
            <span className="text-[10px] font-bold uppercase text-[#356d30]/70">kg</span>
          </div>
        </div>
      </div>

      <div className="group relative overflow-hidden rounded-xl border border-black/10 bg-white/60 p-4">
        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-[#356d30]/75">Recommended Target</p>
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xl font-black tracking-tight text-[#171412]">{recommendedTarget} kcal</span>
              {needsSync && (
                <span className="text-[9px] font-bold uppercase tracking-tighter text-[#356d30] underline decoration-[#4f9d45]/30 underline-offset-2">
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
                  ? "bg-[#4f9d45] text-white"
                : needsSync
                  ? "border border-[#4f9d45]/20 bg-[#4f9d45]/10 text-[#356d30] hover:bg-[#4f9d45] hover:text-white"
                  : "cursor-default bg-black/5 text-[#356d30]/50"
            }`}
          >
            {syncing ? <RefreshCw className="h-4 w-4 animate-spin" /> : synced ? <CheckCircle2 className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}
          </button>
        </div>

        {needsSync && !synced && (
           <div className="absolute bottom-0 left-0 h-[1px] w-full bg-[#4f9d45]/40" />
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-rose-500">
          <AlertCircle className="h-3 w-3" />
          <span className="text-[9px] font-bold uppercase tracking-tight">{error}</span>
        </div>
      )}

      <div className="mt-4 flex items-start gap-2 border-t border-black/10 pt-4">
        <Info className="mt-0.5 h-3 w-3 text-[#356d30]/70" />
        <p className="text-[9px] leading-tight text-[#356d30]/75">
          Your True Maintenance is calculated using a 14-day energy balance analysis. Unlike static formulas, this adjusts for metabolic adaptation and activity variance.
        </p>
      </div>
    </motion.div>
  );
}

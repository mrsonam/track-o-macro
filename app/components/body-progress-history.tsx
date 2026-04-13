"use client";

import { useEffect, useState } from "react";
import { 
  History, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Calendar,
  Activity
} from "lucide-react";
import { motion } from "framer-motion";
import { 
  type UnitSystem, 
  kgToLbs, 
  getWeightLabel 
} from "@/lib/profile/units";

type WeightLog = {
  id: string;
  weightKg: string | number;
  bodyFatPct: string | number | null;
  loggedAt: string;
};

type Props = {
  unitSystem: UnitSystem;
};

export function BodyProgressHistory({ unitSystem }: Props) {
  const [logs, setLogs] = useState<WeightLog[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return <div className="h-24 w-full rounded-2xl bg-white/5 animate-pulse" />;
  }

  if (logs.length === 0) return null;

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-violet-500/10 text-violet-400">
          <Activity className="h-4 w-4" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-400">
          Body Metrics
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {logs.map((log, i) => {
          const weight = unitSystem === "imperial" ? kgToLbs(Number(log.weightKg)) : Number(log.weightKg);
          const nextLog = logs[i + 1];
          const nextWeight = nextLog ? (unitSystem === "imperial" ? kgToLbs(Number(nextLog.weightKg)) : Number(nextLog.weightKg)) : null;
          const delta = nextWeight !== null ? weight - nextWeight : null;

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="group flex items-center justify-between p-5 rounded-2xl bg-zinc-900/40 border border-white/5 hover:border-violet-500/30 transition-all hover:bg-zinc-900/60"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-zinc-500 group-hover:text-violet-400 transition-colors">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">
                    {new Date(log.loggedAt).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                  <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                    Verification Complete
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {delta !== null && delta !== 0 && (
                  <div className={`flex items-center gap-1.5 text-[10px] font-black ${
                    delta > 0 ? "text-red-500/60" : "text-emerald-500/60"
                  }`}>
                    {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                  </div>
                )}
                
                <div className="text-right">
                  <p className="text-xl font-black text-white tracking-tight">
                    {weight.toFixed(1)}<span className="text-[10px] ml-1 text-zinc-600 font-bold uppercase">{getWeightLabel(unitSystem)}</span>
                  </p>
                  {log.bodyFatPct && (
                    <p className="text-[10px] font-black text-violet-500/50 uppercase tracking-tighter">
                      BF: {Number(log.bodyFatPct).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { AlertCircle, Brain, ChevronRight, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { motion } from "framer-motion";

export type IntelligenceBriefData = {
  daysWithLogs: number;
  avgKcal: number;
  targetKcal: number | null;
  weekendDrift: number | null;
  lateEatingPercent: number | null;
  consistencyScore: number; // 0-100
};

type TrendsIntelligenceBriefProps = {
  data: IntelligenceBriefData | null;
  loading: boolean;
};

export function TrendsIntelligenceBrief({ data, loading }: TrendsIntelligenceBriefProps) {
  if (loading) {
    return (
      <div className="w-full rounded-3xl bg-emerald-500/5 border border-emerald-500/10 p-8 mb-12 animate-pulse">
        <div className="h-4 w-32 bg-emerald-500/20 rounded mb-4" />
        <div className="h-8 w-64 bg-emerald-500/20 rounded" />
      </div>
    );
  }

  if (!data || data.daysWithLogs === 0) return null;

  // Heuristics for "One Big Thing"
  const getOneBigThing = () => {
    if (data.weekendDrift && data.weekendDrift > 300) {
      return {
        title: "Weekend lifestyle drift detected",
        description: `Your weekend intake is +${Math.round(data.weekendDrift)}kcal higher than weekdays. Normalizing Sat-Sun will drastically stabilize your weekly trend.`,
        icon: TrendingUp,
        color: "text-amber-400",
        bg: "bg-amber-400/10",
        border: "border-amber-400/20"
      };
    }
    if (data.targetKcal && data.avgKcal > data.targetKcal + 200) {
      return {
        title: "High-volume window detected",
        description: `You're trending ${Math.round(data.avgKcal - data.targetKcal)}kcal above your target. Consider auditing evening meal sizes for easy wins.`,
        icon: AlertCircle,
        color: "text-red-400",
        bg: "bg-red-400/10",
        border: "border-red-400/20"
      };
    }
    if (data.consistencyScore > 85) {
      return {
        title: "Elite logging consistency",
        description: "You've logged every meal boundary with high accuracy this week. This is your strongest predictive baseline for longevity.",
        icon: Zap,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10",
        border: "border-emerald-400/20"
      };
    }
    return {
      title: "Maintaining stable momentum",
      description: "Your patterns are within normal variance. Focus on maintaining the current routine to lock in these metabolic adaptations.",
      icon: Brain,
      color: "text-zinc-300",
      bg: "bg-zinc-800/50",
      border: "border-white/5"
    };
  };

  const obt = getOneBigThing();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative overflow-hidden rounded-3xl border ${obt.border} ${obt.bg} p-6 sm:p-8 mb-12 lg:mb-16`}
    >
      {/* Background Glow */}
      <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
      
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 sm:gap-6">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${obt.bg} ${obt.color} ring-1 ring-white/10 shadow-lg`}>
            <obt.icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Intelligence Brief</span>
              <div className="h-1 w-1 rounded-full bg-zinc-700" />
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Active Insight</span>
            </div>
            <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">{obt.title}</h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-zinc-400 sm:text-base">
              {obt.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 lg:flex-col lg:items-end lg:gap-2">
          <div className="flex -space-x-2">
             {/* Dynamic mini-sparkline or metric tags could go here */}
             <div className="rounded-full bg-zinc-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-white/5">
               {data.consistencyScore}% Consist.
             </div>
             <div className="rounded-full bg-zinc-950/50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-zinc-500 border border-white/5">
               {data.daysWithLogs}/7 Days
             </div>
          </div>
          <button className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors group">
            Optimize Routine
            <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

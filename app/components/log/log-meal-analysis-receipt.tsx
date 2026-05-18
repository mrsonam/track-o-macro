"use client";

import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";
import { MISSING_DISPLAY } from "@/lib/copy/display";
import { motion } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { collapsePanel } from "@/lib/motion";

export type LogMealAnalysisResult = {
  meal_label?: string;
  assumptions?: string[];
  lines: ResolvedLine[];
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    sugar_g: number;
    added_sugar_g?: number | null;
  };
};

function formatLineNutrient(n: number | undefined, fractionDigits = 0) {
  if (n == null || Number.isNaN(n)) return MISSING_DISPLAY;
  if (fractionDigits === 0) return String(Math.round(n));
  return (Math.round(n * 10) / 10).toString();
}

type LogMealAnalysisReceiptProps = {
  result: LogMealAnalysisResult;
  onClear: () => void;
};

export function LogMealAnalysisReceipt({
  result,
  onClear,
}: LogMealAnalysisReceiptProps) {
  return (
    <motion.section
      aria-label="Meal analysis"
      variants={collapsePanel}
      initial="hidden"
      animate="show"
      exit="exit"
      className="bento-card overflow-hidden p-4 sm:p-6"
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#4f9d45] text-white shadow-[0_14px_30px_-18px_rgba(79,157,69,0.85)]">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#356d30]">
              Logged
            </p>
            <h3 className="font-mono text-xl font-black tracking-tight text-[#171412] sm:text-2xl">
              {result.meal_label?.trim() || "Meal breakdown"}
            </h3>
            <p className="mt-0.5 text-xs font-medium text-zinc-600">
              Estimated macros from your entry.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="focus-ring tap-target cursor-pointer rounded-full border border-black/10 bg-white p-2 text-zinc-500 transition-colors duration-200 hover:border-black/20 hover:text-[#171412]"
          aria-label="Dismiss analysis"
        >
          <Plus className="h-5 w-5 rotate-45" aria-hidden />
        </button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-3">
        <div className="rounded-2xl border border-black/10 bg-[#fffdf7] p-3.5 sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-500">
            Calories
          </p>
          <p className="mt-1.5 font-mono text-3xl font-black leading-none text-[#171412] sm:text-4xl">
            {Math.round(result.totals.kcal)}
            <span className="ml-1 text-[10px] font-black uppercase text-zinc-500">
              kcal
            </span>
          </p>
        </div>
        <div className="rounded-2xl border border-[#4f9d45]/20 bg-[#eaf7df] p-3.5 sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#356d30]">
            Protein
          </p>
          <p className="mt-1.5 font-mono text-2xl font-black text-[#171412] sm:text-3xl">
            {result.totals.protein_g}
            <span className="ml-1 text-[10px] font-black text-[#356d30]">g</span>
          </p>
        </div>
        <div className="rounded-2xl border border-sky-500/20 bg-[#dff1ff] p-3.5 sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-sky-900/70">
            Carbs
          </p>
          <p className="mt-1.5 font-mono text-2xl font-black text-[#171412] sm:text-3xl">
            {result.totals.carbs_g}
            <span className="ml-1 text-[10px] font-black text-sky-800">g</span>
          </p>
        </div>
        <div className="rounded-2xl border border-black/10 bg-[#f7f3e9] p-3.5 sm:p-4">
          <p className="text-[10px] font-black uppercase tracking-wider text-[#6d6251]">
            Fat
          </p>
          <p className="mt-1.5 font-mono text-2xl font-black text-[#171412] sm:text-3xl">
            {result.totals.fat_g}
            <span className="ml-1 text-[10px] font-black text-[#6d6251]">g</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <div>
          <p className="mb-3 px-0.5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
            Ingredients
          </p>
          <ul className="space-y-2.5">
            {result.lines.map((line, i) => (
              <li
                key={`${line.label}-${i}`}
                className="rounded-2xl border border-black/10 bg-white/80 p-3.5 transition-colors duration-200 hover:bg-white"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-[#171412]">
                      {line.label}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                      {line.quantity} {line.unit}
                    </p>
                  </div>
                  <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-[#eaf7df] px-2 py-1 text-[#356d30]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4f9d45]" aria-hidden />
                    <span className="text-[9px] font-black uppercase tracking-widest">
                      {line.source}
                    </span>
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-xl bg-[#f7f3e9] px-2.5 py-2">
                    <p className="text-[9px] font-black uppercase text-zinc-500">kcal</p>
                    <p className="font-mono text-sm font-black text-[#171412]">
                      {formatLineNutrient(line.kcal)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#eaf7df] px-2.5 py-2">
                    <p className="text-[9px] font-black uppercase text-[#356d30]/75">
                      protein
                    </p>
                    <p className="font-mono text-sm font-black text-[#171412]">
                      {formatLineNutrient(line.protein_g)}
                      <span className="text-[10px] font-semibold text-[#356d30]">g</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#dff1ff] px-2.5 py-2">
                    <p className="text-[9px] font-black uppercase text-sky-900/65">
                      carbs
                    </p>
                    <p className="font-mono text-sm font-black text-[#171412]">
                      {formatLineNutrient(line.carbs_g)}
                      <span className="text-[10px] font-semibold text-sky-800">g</span>
                    </p>
                  </div>
                  <div className="rounded-xl bg-[#f7f3e9] px-2.5 py-2">
                    <p className="text-[9px] font-black uppercase text-[#6d6251]">fat</p>
                    <p className="font-mono text-sm font-black text-[#171412]">
                      {formatLineNutrient(line.fat_g)}
                      <span className="text-[10px] font-semibold text-[#6d6251]">g</span>
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <p className="px-0.5 text-[10px] font-black uppercase tracking-[0.24em] text-zinc-500">
            Micronutrients
          </p>
          <div className="flex items-center justify-between rounded-2xl border border-[#4f9d45]/15 bg-white/80 px-4 py-3">
            <span className="text-xs font-black text-zinc-600">Fiber</span>
            <p className="font-mono text-sm font-black text-[#356d30]">
              {result.totals.fiber_g ?? 0}
              <span className="ml-0.5 text-[10px] font-bold">g</span>
            </p>
          </div>
          <div className="flex items-center justify-between rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
            <span className="text-xs font-black text-zinc-600">Sodium</span>
            <p className="font-mono text-sm font-black text-[#171412]">
              {Math.round(result.totals.sodium_mg ?? 0)}
              <span className="ml-0.5 text-[10px] font-bold uppercase">mg</span>
            </p>
          </div>
          <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/20 bg-white/80 px-4 py-3">
            <span className="text-xs font-black text-zinc-600">Sugars</span>
            <div className="text-right">
              <p className="font-mono text-sm font-black text-[#171412]">
                {result.totals.sugar_g ?? 0}
                <span className="ml-0.5 text-[10px] font-bold text-zinc-500">g total</span>
              </p>
              {result.totals.added_sugar_g != null ? (
                <p className="mt-0.5 text-[10px] font-bold text-[#6d6251]">
                  ~{Math.round(result.totals.added_sugar_g)} g added
                </p>
              ) : null}
            </div>
          </div>
          {result.assumptions && result.assumptions.length > 0 ? (
            <div className="rounded-2xl border border-black/10 bg-[#f7f3e9] p-4">
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-[#6d6251]">
                Assumptions
              </p>
              <ul className="space-y-1.5">
                {result.assumptions.map((a, i) => (
                  <li
                    key={i}
                    className="text-[11px] font-medium leading-relaxed text-zinc-600"
                  >
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </motion.section>
  );
}

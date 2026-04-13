"use client";

import {
  PORTION_COMMON_FOODS,
  PORTION_HAND_GUIDE,
  PORTION_VOLUME_HINTS,
} from "@/lib/meals/portion-hints";

export function MealPortionHints() {
  return (
    <details className="group rounded-2xl border border-white/5 bg-zinc-900/40 px-4 py-3 text-sm text-zinc-400 transition-all hover:bg-zinc-900/60">
      <summary className="cursor-pointer list-none font-bold text-zinc-200 outline-none flex items-center gap-3 [&::-webkit-details-marker]:hidden">
        <div className="h-6 w-6 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
          <span className="text-xs transition-transform group-open:rotate-90">
            ▶
          </span>
        </div>
        Archive Reference: Portions
      </summary>
      
      <p className="mt-4 text-[11px] font-medium leading-relaxed text-zinc-500 max-w-sm">
        Standardized database unit conversions. Use as baseline parameters for 
        precision logging.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-white/5 text-zinc-600">
              <th className="py-2 pr-2 font-black uppercase tracking-widest">Volume / Unit</th>
              <th className="py-2 font-black uppercase tracking-widest">Grams Baseline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.02]">
            {PORTION_VOLUME_HINTS.map((r) => (
              <tr key={r.item} className="group/row transition-colors hover:bg-white/[0.01]">
                <td className="py-2.5 pr-2 align-top text-zinc-300 font-medium">{r.item}</td>
                <td className="py-2.5 text-zinc-500 tabular-nums">{r.grams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/70 ml-1">
        Common Food Registry
      </p>
      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[11px] text-zinc-400">
        {PORTION_COMMON_FOODS.map((r) => (
          <li key={r.item} className="flex justify-between items-center border-b border-white/[0.02] pb-1">
            <span className="text-zinc-300">{r.item}</span>
            <span className="text-zinc-500 tabular-nums">{r.grams}</span>
          </li>
        ))}
      </ul>
      
      <div className="mt-6 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10 flex items-start gap-3">
        <div className="mt-0.5 h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
        <p className="text-[10px] font-medium leading-relaxed text-emerald-400/90 italic">
          {PORTION_HAND_GUIDE}
        </p>
      </div>
    </details>
  );
}

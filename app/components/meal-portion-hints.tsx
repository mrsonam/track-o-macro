"use client";

import {
  PORTION_COMMON_FOODS,
  PORTION_HAND_GUIDE,
  PORTION_VOLUME_HINTS,
} from "@/lib/meals/portion-hints";

export function MealPortionHints() {
  return (
    <details className="group rounded-2xl border border-black/10 bg-[#f7f3e9] px-4 py-3 text-sm text-zinc-600 transition-colors duration-200 hover:bg-[#f2eadb]">
      <summary className="flex cursor-pointer list-none items-center gap-3 font-bold text-[#171412] outline-none [&::-webkit-details-marker]:hidden">
        <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#4f9d45]/10 text-[#356d30] transition-colors group-hover:bg-[#4f9d45]/20">
          <span className="text-xs transition-transform group-open:rotate-90">
            ▶
          </span>
        </div>
        Portion & unit reference
      </summary>
      
      <p className="mt-4 max-w-sm text-[11px] font-medium leading-relaxed text-zinc-500">
        Rough averages for logging — not label-accurate. Use a scale when you need
        exact grams.
      </p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-[11px]">
          <thead>
            <tr className="border-b border-black/10 text-zinc-500">
              <th className="py-2 pr-2 font-black uppercase tracking-widest">Volume / Unit</th>
              <th className="py-2 font-black uppercase tracking-widest">Grams Baseline</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {PORTION_VOLUME_HINTS.map((r) => (
              <tr key={r.item} className="group/row transition-colors hover:bg-white/40">
                <td className="py-2.5 pr-2 align-top font-medium text-[#171412]">{r.item}</td>
                <td className="py-2.5 text-zinc-500 tabular-nums">{r.grams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 ml-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#356d30]">
        Common foods (~grams)
      </p>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 text-[11px] text-zinc-600 sm:grid-cols-2">
        {PORTION_COMMON_FOODS.map((r) => (
          <li key={r.item} className="flex items-center justify-between border-b border-black/[0.06] pb-1">
            <span className="text-[#171412]">{r.item}</span>
            <span className="text-zinc-500 tabular-nums">{r.grams}</span>
          </li>
        ))}
      </ul>
      
      <div className="mt-6 flex items-start gap-3 rounded-xl border border-[#4f9d45]/15 bg-white/60 p-3">
        <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4f9d45]" />
        <p className="text-[10px] font-medium leading-relaxed text-[#356d30]">
          {PORTION_HAND_GUIDE}
        </p>
      </div>
    </details>
  );
}

"use client";

import {
  PORTION_COMMON_FOODS,
  PORTION_HAND_GUIDE,
  PORTION_VOLUME_HINTS,
} from "@/lib/meals/portion-hints";

export function MealPortionHints() {
  return (
    <details className="group rounded-xl border border-stone-200/90 bg-white/80 px-3 py-2 text-sm text-stone-700 shadow-sm">
      <summary className="cursor-pointer list-none font-medium text-stone-800 outline-none [&::-webkit-details-marker]:hidden">
        <span className="mr-1.5 inline-block text-stone-400 transition group-open:rotate-90">
          ▸
        </span>
        Portion &amp; unit hints
      </summary>
      <p className="mt-2 text-xs leading-relaxed text-stone-500">
        Typical conversions to grams—use as a starting point, not exact labels.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-stone-200 text-stone-500">
              <th className="py-1.5 pr-2 font-medium">Volume / unit</th>
              <th className="py-1.5 font-medium">Hint</th>
            </tr>
          </thead>
          <tbody>
            {PORTION_VOLUME_HINTS.map((r) => (
              <tr key={r.item} className="border-b border-stone-100">
                <td className="py-1.5 pr-2 align-top text-stone-800">{r.item}</td>
                <td className="py-1.5 text-stone-600">{r.grams}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[11px] font-medium uppercase tracking-wide text-stone-500">
        Common foods
      </p>
      <ul className="mt-1.5 space-y-1 text-xs text-stone-600">
        {PORTION_COMMON_FOODS.map((r) => (
          <li key={r.item}>
            <span className="font-medium text-stone-800">{r.item}</span>
            {" — "}
            {r.grams}
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-lg border border-amber-100/90 bg-amber-50/60 px-2.5 py-2 text-[11px] leading-relaxed text-amber-950/90">
        {PORTION_HAND_GUIDE}
      </p>
    </details>
  );
}

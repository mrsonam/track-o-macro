"use client";

import {
  COMPOSER_UNIT_OPTIONS,
  type ComposerRow,
  newComposerRow,
} from "@/lib/meals/meal-composer";

type MealItemComposerProps = {
  rows: ComposerRow[];
  onChange: (rows: ComposerRow[]) => void;
  disabled?: boolean;
};

export function MealItemComposer({
  rows,
  onChange,
  disabled = false,
}: MealItemComposerProps) {
  function updateRow(id: string, patch: Partial<ComposerRow>) {
    onChange(
      rows.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
  }

  function addRow() {
    onChange([...rows, newComposerRow()]);
  }

  function removeRow(id: string) {
    if (rows.length <= 1) return;
    onChange(rows.filter((r) => r.id !== id));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-medium leading-relaxed text-zinc-500 max-w-sm">
        Add one row per operational item. Parameters are tokenized and processed
        into the main registry.
      </p>
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="rounded-2xl border border-white/5 bg-zinc-950/50 p-4 transition-colors duration-200 hover:bg-zinc-950/80"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[4.5rem] flex-1 sm:max-w-[6rem]">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">
                  Amount
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  disabled={disabled}
                  value={row.qty}
                  onChange={(e) => updateRow(row.id, { qty: e.target.value })}
                  placeholder={row.unit === "count" ? "optional" : "e.g. 1"}
                  className="input-field py-2 text-sm tabular-nums"
                />
              </label>
              <label className="min-w-[8rem] flex-1 sm:max-w-[11rem]">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">
                  Unit
                </span>
                <select
                  disabled={disabled}
                  value={row.unit}
                  onChange={(e) =>
                    updateRow(row.id, {
                      unit: e.target.value as ComposerRow["unit"],
                    })
                  }
                  className="input-field py-2 text-sm"
                >
                  {COMPOSER_UNIT_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="min-w-[8rem] w-full flex-[2]">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">
                  Food
                </span>
                <input
                  type="text"
                  autoComplete="off"
                  disabled={disabled}
                  value={row.food}
                  onChange={(e) => updateRow(row.id, { food: e.target.value })}
                  placeholder={
                    row.unit === "count"
                      ? 'Example: amount 2, food "large eggs"'
                      : "e.g. rolled oats"
                  }
                  className="input-field py-2 text-sm"
                />
              </label>
              <div className="flex w-full justify-end sm:ml-auto sm:w-auto sm:pb-0.5">
                <button
                  type="button"
                  disabled={disabled || rows.length <= 1}
                  onClick={() => removeRow(row.id)}
                  className="focus-ring tap-target rounded-xl px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20"
                  aria-label={`Remove item ${index + 1}`}
                >
                  Terminate
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={disabled}
        onClick={addRow}
        className="focus-ring tap-target relative flex items-center gap-2 self-start rounded-xl border border-dashed border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-emerald-400 transition-[colors,transform] duration-200 hover:bg-emerald-500/10 active:scale-[0.98] disabled:opacity-30"
      >
        <span className="text-sm">+</span> Add Entry Part
      </button>
    </div>
  );
}

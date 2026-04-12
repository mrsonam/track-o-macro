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
      <p className="text-xs leading-relaxed text-stone-500">
        Add one row per item. Amount and unit are turned into plain language
        for analysis (same as typing in the box).
      </p>
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="rounded-xl border border-stone-200/90 bg-white/90 p-3 shadow-sm"
          >
            <div className="flex flex-wrap items-end gap-2">
              <label className="min-w-[4.5rem] flex-1 sm:max-w-[6rem]">
                <span className="mb-1 block text-[11px] font-medium text-stone-500">
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
                <span className="mb-1 block text-[11px] font-medium text-stone-500">
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
                <span className="mb-1 block text-[11px] font-medium text-stone-500">
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
                  className="rounded-lg px-2 py-1.5 text-xs font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:cursor-not-allowed disabled:opacity-40"
                  aria-label={`Remove item ${index + 1}`}
                >
                  Remove
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
        className="self-start rounded-lg border border-dashed border-emerald-300/90 bg-emerald-50/50 px-3 py-2 text-xs font-semibold text-emerald-900 hover:bg-emerald-100/80 disabled:opacity-50"
      >
        + Add item
      </button>
    </div>
  );
}

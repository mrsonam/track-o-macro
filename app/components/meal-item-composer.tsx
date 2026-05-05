"use client";

import { useEffect, useState } from "react";
import {
  COMPOSER_UNIT_OPTIONS,
  type ComposerRow,
  newComposerRow,
} from "@/lib/meals/meal-composer";
import { CustomSelect } from "@/app/components/custom-select";

type MealItemComposerProps = {
  rows: ComposerRow[];
  onChange: (rows: ComposerRow[]) => void;
  disabled?: boolean;
  onSuggestionPicked?: (item: SuggestionItem) => void;
};

type SuggestionItem = {
  label: string;
  fdcId: number;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

export function MealItemComposer({
  rows,
  onChange,
  disabled = false,
  onSuggestionPicked,
}: MealItemComposerProps) {
  const [openSuggestionsForRow, setOpenSuggestionsForRow] = useState<string | null>(
    null,
  );
  const [suggestionsByRow, setSuggestionsByRow] = useState<
    Record<string, SuggestionItem[]>
  >({});

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
    setSuggestionsByRow((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    setOpenSuggestionsForRow((prev) => (prev === id ? null : prev));
  }

  useEffect(() => {
    const queries = rows
      .map((row) => ({ id: row.id, q: row.food.trim() }))
      .filter((item) => item.q.length >= 2);
    if (queries.length === 0) return;

    const timer = setTimeout(() => {
      void Promise.all(
        queries.map(async ({ id, q }) => {
          try {
            const url = new URL("/api/nutrition/usda-search", window.location.origin);
            url.searchParams.set("q", q);
            const res = await fetch(url.toString(), { credentials: "same-origin" });
            const json = (await res.json().catch(() => ({}))) as {
              items?: SuggestionItem[];
            };
            console.log("[avocavo-search][client] row suggestions:", json);
            setSuggestionsByRow((prev) => ({
              ...prev,
              [id]: Array.isArray(json.items) ? json.items : [],
            }));
          } catch {
            setSuggestionsByRow((prev) => ({ ...prev, [id]: [] }));
          }
        }),
      );
    }, 220);

    return () => clearTimeout(timer);
  }, [rows]);

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-sm text-[11px] font-medium leading-relaxed text-zinc-500">
        One row per food. Amount, unit, and name are combined into plain text for
        analysis (same as typing in Free mode).
      </p>
      <ul className="space-y-3">
        {rows.map((row, index) => (
          <li
            key={row.id}
            className="rounded-2xl border border-black/10 bg-[#fffdf7] p-4 transition-colors duration-200 hover:bg-[#f2f8ec]"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-2">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-nowrap sm:items-end">
                <label className="min-w-0 sm:min-w-[4.5rem] sm:max-w-[6rem] sm:flex-1">
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
                    className="input-field w-full py-2.5 text-base tabular-nums sm:py-2 sm:text-sm"
                  />
                </label>
                <label className="min-w-0 sm:min-w-[8rem] sm:max-w-[11rem] sm:flex-1">
                  <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">
                    Unit
                  </span>
                  <CustomSelect
                    disabled={disabled}
                    value={row.unit}
                    onChange={(value) =>
                      updateRow(row.id, {
                        unit: value as ComposerRow["unit"],
                      })
                    }
                    buttonClassName="input-field w-full py-2.5 text-base sm:py-2 sm:text-sm"
                    options={COMPOSER_UNIT_OPTIONS.map((o) => ({
                      value: o.id,
                      label: o.label,
                    }))}
                  />
                </label>
              </div>
              <label className="min-w-0 w-full sm:min-w-[8rem] sm:flex-[2]">
                <span className="mb-1 block text-[11px] font-black uppercase tracking-[0.1em] text-zinc-600">
                  Food
                </span>
                <div className="relative">
                  <input
                    type="text"
                    autoComplete="off"
                    disabled={disabled}
                    value={row.food}
                    onChange={(e) => {
                      updateRow(row.id, { food: e.target.value });
                      setOpenSuggestionsForRow(row.id);
                    }}
                    onFocus={() => setOpenSuggestionsForRow(row.id)}
                    onBlur={() => {
                      setTimeout(() => {
                        setOpenSuggestionsForRow((prev) =>
                          prev === row.id ? null : prev,
                        );
                      }, 120);
                    }}
                    placeholder={
                      row.unit === "count"
                        ? 'Example: amount 2, food "large eggs"'
                        : "e.g. rolled oats"
                    }
                    className="input-field w-full py-2.5 text-base sm:py-2 sm:text-sm"
                  />
                  {openSuggestionsForRow === row.id &&
                  row.food.trim().length >= 2 &&
                  (suggestionsByRow[row.id]?.length ?? 0) > 0 ? (
                    <ul className="absolute z-40 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-black/10 bg-white p-1 shadow-[0_20px_40px_-24px_rgba(23,20,18,0.5)]">
                      {(suggestionsByRow[row.id] ?? []).map((item) => (
                        <li key={`${row.id}-${item.fdcId}`}>
                          <button
                            type="button"
                            disabled={disabled}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              updateRow(row.id, { food: item.label });
                              onSuggestionPicked?.(item);
                              setOpenSuggestionsForRow(null);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-zinc-800 transition-colors hover:bg-[#f7f3e9]"
                          >
                            <span className="flex items-center justify-between gap-3">
                              <span className="truncate">{item.label}</span>
                              {item.kcalPer100g != null ? (
                                <span className="shrink-0 text-[11px] font-bold text-[#4f9d45]">
                                  {Math.round(item.kcalPer100g)} kcal
                                </span>
                              ) : null}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </label>
              <div className="flex w-full justify-stretch sm:ml-auto sm:w-auto sm:justify-end sm:pb-0.5">
                <button
                  type="button"
                  disabled={disabled || rows.length <= 1}
                  onClick={() => removeRow(row.id)}
                  className="focus-ring tap-target w-full rounded-xl px-3 py-2.5 text-[10px] font-black uppercase tracking-widest text-zinc-600 transition-colors duration-200 hover:bg-red-500/10 hover:text-red-400 disabled:opacity-20 sm:w-auto sm:py-1.5"
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
        className="focus-ring tap-target relative flex items-center gap-2 self-start rounded-xl border border-dashed border-[#4f9d45]/30 bg-[#4f9d45]/10 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-[#356d30] transition-[colors,transform] duration-200 hover:bg-[#4f9d45]/15 active:scale-[0.98] disabled:opacity-30"
      >
        <span className="text-sm">+</span> Add row
      </button>
    </div>
  );
}

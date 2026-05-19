"use client";

import { useEffect, useMemo, useState } from "react";
import { CustomSelect } from "@/app/components/custom-select";
import { sanitizePositiveDecimalInput } from "@/lib/forms/sanitize-positive-decimal-input";
import {
  defaultServingOptionId,
  matchCuratedRule,
  portionFromServingOption,
  servingOptionsForFood,
  type PortionServingOption,
  type ParsedNaturalPortion,
} from "@/lib/meals/portion-resolve";

export type PortionInputValue = ParsedNaturalPortion;

type PortionInputProps = {
  foodLabel: string;
  servings?: PortionServingOption[];
  initialQuantity?: number;
  initialServingId?: string;
  onChange: (value: PortionInputValue) => void;
};

export function PortionInput({
  foodLabel,
  servings,
  initialQuantity = 1,
  initialServingId,
  onChange,
}: PortionInputProps) {
  const options = useMemo(
    () => servingOptionsForFood(foodLabel, servings),
    [foodLabel, servings],
  );

  const unitSelectOptions = useMemo(
    () => options.map((o) => ({ value: o.id, label: o.label })),
    [options],
  );

  const defaultOptionId = useMemo(
    () => initialServingId ?? defaultServingOptionId(foodLabel, options),
    [initialServingId, foodLabel, options],
  );

  const defaultQty = useMemo(() => {
    const rule = matchCuratedRule(foodLabel);
    return rule?.defaultQuantity ?? initialQuantity;
  }, [foodLabel, initialQuantity]);

  const [quantity, setQuantity] = useState(String(defaultQty));
  const [servingId, setServingId] = useState(defaultOptionId);

  const selected =
    options.find((o) => o.id === servingId) ?? options[0] ?? null;

  const preview = useMemo(() => {
    const qty = Number(quantity);
    if (!selected || !Number.isFinite(qty) || qty <= 0) return null;
    return portionFromServingOption(selected, qty, foodLabel);
  }, [quantity, selected, foodLabel]);

  useEffect(() => {
    if (preview) onChange(preview);
  }, [preview, onChange]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-[minmax(0,5rem)_1fr] gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Qty
          </span>
          <input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={quantity}
            onChange={(e) =>
              setQuantity(sanitizePositiveDecimalInput(e.target.value))
            }
            className="input-field w-full py-2.5 text-base tabular-nums sm:py-2 sm:text-sm"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
            Unit
          </span>
          <CustomSelect
            value={servingId}
            onChange={setServingId}
            buttonClassName="input-field w-full py-2.5 text-base sm:py-2 sm:text-sm"
            options={unitSelectOptions}
          />
        </label>
      </div>
      {preview ? (
        <p className="rounded-xl border border-black/10 bg-warm-neutral/60 px-3 py-2 text-xs leading-relaxed text-zinc-700">
          <span className="font-bold text-foreground">{preview.displayLabel}</span>
          <span className="text-zinc-500"> · about {Math.round(preview.grams)} g</span>
          {preview.assumption ? (
            <span className="mt-1 block text-[10px] text-zinc-500">{preview.assumption}</span>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}

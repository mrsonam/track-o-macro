"use client";

import { useId, useState } from "react";
import { PortionInput, type PortionInputValue } from "@/app/components/log/portion-input";
import { ResponsiveOverlay } from "@/app/components/responsive-overlay";
import type { PortionServingOption } from "@/lib/meals/portion-resolve";

type PortionPickSheetProps = {
  foodLabel: string;
  servings?: PortionServingOption[];
  /** Defaults to "Add to meal" */
  confirmLabel?: string;
  onConfirm: (lineText: string, portion: PortionInputValue) => void;
  onCancel: () => void;
};

export function PortionPickSheet({
  foodLabel,
  servings,
  confirmLabel = "Add to meal",
  onConfirm,
  onCancel,
}: PortionPickSheetProps) {
  const titleId = useId();
  const [portion, setPortion] = useState<PortionInputValue | null>(null);

  return (
    <ResponsiveOverlay
      open
      onClose={onCancel}
      ariaLabelledBy={titleId}
      showCloseButton
      mobileSheetMinHeightClass="min-h-[50vh] sm:min-h-0"
      header={
        <>
          <p
            id={titleId}
            className="text-[10px] font-black uppercase tracking-[0.28em] text-signal-deep"
          >
            Portion
          </p>
          <p className="mt-1 truncate text-sm font-bold text-foreground">{foodLabel}</p>
        </>
      }
      footer={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="focus-ring tap-target flex-1 cursor-pointer rounded-xl border border-black/10 px-4 py-3 text-xs font-bold text-zinc-700 hover:bg-warm-neutral"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!portion}
            onClick={() => {
              if (!portion) return;
              onConfirm(portion.displayLabel, portion);
            }}
            className="btn-primary flex-1 py-3 text-xs disabled:opacity-40"
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <div className="pb-4 pt-1">
        <PortionInput
          foodLabel={foodLabel}
          servings={servings}
          onChange={setPortion}
        />
      </div>
    </ResponsiveOverlay>
  );
}

import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";

export type LinePortionDisplay = {
  primary: string;
  secondary: string | null;
  assumption: string | null;
};

export function linePortionDisplay(line: ResolvedLine): LinePortionDisplay {
  const displayLabel =
    line.display_label ??
    (typeof line.detail === "object" &&
    line.detail != null &&
    "unit_note" in line.detail &&
    typeof (line.detail as { unit_note?: string }).unit_note === "string"
      ? (line.detail as { unit_note: string }).unit_note
      : null);

  const grams =
    line.unit === "g" && line.quantity > 0 ? Math.round(line.quantity) : null;

  if (displayLabel) {
    return {
      primary: displayLabel,
      secondary: grams != null ? `~${grams} g` : null,
      assumption: line.assumption ?? null,
    };
  }

  if (grams != null) {
    return {
      primary: `${grams} g`,
      secondary: line.label,
      assumption: line.assumption ?? null,
    };
  }

  return {
    primary: line.label,
    secondary: null,
    assumption: line.assumption ?? null,
  };
}

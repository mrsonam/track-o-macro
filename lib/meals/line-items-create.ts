import type { Prisma } from "@prisma/client";
import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";

function mealLineDetailJson(
  line: ResolvedLine,
  meal_label?: string,
  assumptions?: string[] | null,
): Prisma.InputJsonValue {
  const merged: Record<string, Prisma.InputJsonValue> = {
    ...(line.detail as Record<string, Prisma.InputJsonValue> | undefined),
    protein_g: line.protein_g,
    carbs_g: line.carbs_g,
    fat_g: line.fat_g,
  };
  if (meal_label != null && meal_label !== "") {
    merged.meal_label = meal_label;
  }
  if (assumptions != null && assumptions.length > 0) {
    merged.assumptions = assumptions;
  }
  if (line.fiber_g != null) merged.fiber_g = line.fiber_g;
  if (line.sodium_mg != null) merged.sodium_mg = line.sodium_mg;
  if (line.sugar_g != null) merged.sugar_g = line.sugar_g;
  if (line.added_sugar_g != null) merged.added_sugar_g = line.added_sugar_g;
  if (line.display_quantity != null) merged.display_quantity = line.display_quantity;
  if (line.display_unit != null) merged.display_unit = line.display_unit;
  if (line.display_label != null) merged.display_label = line.display_label;
  if (line.conversion_source != null) merged.conversion_source = line.conversion_source;
  if (line.assumption != null) merged.assumption = line.assumption;
  return merged;
}

export function prismaLineCreates(
  lines: ResolvedLine[],
  meal_label?: string,
  assumptions?: string[] | null,
) {
  return lines.map((l) => ({
    label: l.label,
    quantity: l.quantity ?? null,
    unit: l.unit ?? null,
    displayQuantity: l.display_quantity ?? null,
    displayUnit: l.display_unit ?? null,
    displayLabel: l.display_label ?? null,
    conversionSource: l.conversion_source ?? null,
    assumption: l.assumption ?? null,
    kcal: l.kcal,
    proteinG: l.protein_g,
    carbsG: l.carbs_g,
    fatG: l.fat_g,
    fiberG: l.fiber_g ?? null,
    sodiumMg: l.sodium_mg ?? null,
    sugarG: l.sugar_g ?? null,
    addedSugarG: l.added_sugar_g ?? null,
    fdcId: l.fdc_id ?? null,
    source: l.source,
    detail: mealLineDetailJson(l, meal_label, assumptions),
  }));
}

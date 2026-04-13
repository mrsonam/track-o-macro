import type { ResolvedLine } from "@/lib/nutrition/resolve-ingredient";

export function prismaLineCreates(
  lines: ResolvedLine[],
  meal_label?: string,
  assumptions?: string[] | null,
) {
  return lines.map((l) => ({
    label: l.label,
    quantity: l.quantity ?? null,
    unit: l.unit ?? null,
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
    detail: {
      ...l.detail,
      protein_g: l.protein_g,
      carbs_g: l.carbs_g,
      fat_g: l.fat_g,
      fiber_g: l.fiber_g,
      sodium_mg: l.sodium_mg,
      sugar_g: l.sugar_g,
      added_sugar_g: l.added_sugar_g,
      meal_label: meal_label ?? null,
      assumptions: assumptions ?? null,
    },
  }));
}

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
    fdcId: l.fdc_id ?? null,
    source: l.source,
    detail: {
      ...l.detail,
      protein_g: l.protein_g,
      carbs_g: l.carbs_g,
      fat_g: l.fat_g,
      meal_label: meal_label ?? null,
      assumptions: assumptions ?? null,
    },
  }));
}

import type { AvocavoBatchItem } from "./avocavo";

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

/** Avocavo may use `sugars`, `sugar`, or `added_sugars` depending on endpoint version. */
export type AvocavoNutritionSugars = NonNullable<AvocavoBatchItem["nutrition"]> & {
  sugar?: number;
  added_sugars?: number | null;
};

export function sugarsFromAvocavoNutrition(
  n: AvocavoNutritionSugars,
): { sugar_g?: number; added_sugar_g?: number } {
  const totalRaw = n.sugars ?? n.sugar;
  const sugar_g =
    totalRaw != null && Number.isFinite(Number(totalRaw))
      ? round1(Number(totalRaw))
      : undefined;

  const rawAdded = n.added_sugars;
  let added_sugar_g: number | undefined;
  if (rawAdded != null && Number.isFinite(Number(rawAdded))) {
    added_sugar_g = round1(Number(rawAdded));
  }

  return { sugar_g, added_sugar_g };
}

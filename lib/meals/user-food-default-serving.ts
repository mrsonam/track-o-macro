import { normalizeGenericPortionUnit } from "@/lib/meals/portion-resolve";

export type UserFoodDefaultServing = {
  defaultServingQty: number;
  defaultServingUnit: string;
  defaultServingGrams: number;
};

export function parseUserFoodDefaultServing(body: {
  defaultServingQty?: unknown;
  defaultServingUnit?: string;
  defaultServingGrams?: unknown;
}): UserFoodDefaultServing | null | "invalid" {
  const qtyRaw = body.defaultServingQty;
  const unit = body.defaultServingUnit?.trim() ?? "";
  const gramsRaw = body.defaultServingGrams;

  const allEmpty =
    (qtyRaw === undefined || qtyRaw === "" || qtyRaw === null) &&
    !unit &&
    (gramsRaw === undefined || gramsRaw === "" || gramsRaw === null);
  if (allEmpty) return null;

  const qty =
    typeof qtyRaw === "number"
      ? qtyRaw
      : typeof qtyRaw === "string" && qtyRaw.trim()
        ? parseFloat(qtyRaw)
        : NaN;
  const grams =
    typeof gramsRaw === "number"
      ? gramsRaw
      : typeof gramsRaw === "string" && gramsRaw.trim()
        ? parseFloat(gramsRaw)
        : NaN;

  const normalizedUnit = normalizeGenericPortionUnit(unit);
  if (
    !Number.isFinite(qty) ||
    qty <= 0 ||
    qty > 999 ||
    !unit ||
    unit.length > 80 ||
    !normalizedUnit ||
    !Number.isFinite(grams) ||
    grams <= 0 ||
    grams > 5000
  ) {
    return "invalid";
  }

  return {
    defaultServingQty: qty,
    defaultServingUnit: normalizedUnit,
    defaultServingGrams: grams,
  };
}

export function serializeUserFoodDefaultServing(row: {
  defaultServingQty: { toString(): string } | null;
  defaultServingUnit: string | null;
  defaultServingGrams: { toString(): string } | null;
}) {
  if (
    row.defaultServingQty == null ||
    row.defaultServingUnit == null ||
    row.defaultServingGrams == null
  ) {
    return {
      defaultServingQty: null,
      defaultServingUnit: null,
      defaultServingGrams: null,
    };
  }
  return {
    defaultServingQty: Number(row.defaultServingQty),
    defaultServingUnit: row.defaultServingUnit,
    defaultServingGrams: Number(row.defaultServingGrams),
  };
}

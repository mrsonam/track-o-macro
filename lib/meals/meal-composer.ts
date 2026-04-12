/**
 * Multi-item meal composer: structured rows → newline-separated text for analyze.
 */

export type ComposerUnitId =
  | "g"
  | "oz"
  | "cup"
  | "tbsp"
  | "tsp"
  | "ml"
  | "slice"
  | "pieces"
  | "count";

export type ComposerRow = {
  id: string;
  qty: string;
  unit: ComposerUnitId;
  /** Food name / phrase (e.g. "rolled oats", "large eggs") */
  food: string;
};

export const COMPOSER_UNIT_OPTIONS: { id: ComposerUnitId; label: string }[] = [
  { id: "g", label: "g" },
  { id: "oz", label: "oz (weight)" },
  { id: "cup", label: "cup" },
  { id: "tbsp", label: "tbsp" },
  { id: "tsp", label: "tsp" },
  { id: "ml", label: "ml" },
  { id: "slice", label: "slice(s)" },
  { id: "pieces", label: "pieces" },
  { id: "count", label: "Count / describe" },
];

function parseQty(q: string): number | null {
  const t = q.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function isSingularQty(q: string): boolean {
  const n = parseQty(q);
  return n === 1;
}

/**
 * Turn one composer row into a natural-language line, or null if empty / invalid.
 */
export function formatComposerRow(row: ComposerRow): string | null {
  const food = row.food.trim();
  if (!food) return null;

  const qtyRaw = row.qty.trim();
  const unit = row.unit;

  if (unit === "count") {
    if (!qtyRaw) return food;
    return `${qtyRaw} ${food}`;
  }

  const q = qtyRaw || "1";

  switch (unit) {
    case "g":
      return `${q} g ${food}`;
    case "oz":
      return `${q} oz ${food}`;
    case "cup":
      return `${q} cup${isSingularQty(q) ? "" : "s"} ${food}`;
    case "tbsp":
      return `${q} tbsp ${food}`;
    case "tsp":
      return `${q} tsp ${food}`;
    case "ml":
      return `${q} ml ${food}`;
    case "slice":
      return `${q} slice${isSingularQty(q) ? "" : "es"} ${food}`;
    case "pieces":
      return `${q} pieces ${food}`;
    default:
      return `${q} ${food}`;
  }
}

export function composerRowsToRawInput(rows: ComposerRow[]): string {
  const lines = rows
    .map((r) => formatComposerRow(r))
    .filter((s): s is string => Boolean(s));
  return lines.join("\n");
}

export function composerHasAnalyzableContent(rows: ComposerRow[]): boolean {
  return rows.some((r) => formatComposerRow(r) !== null);
}

export function newComposerRow(): ComposerRow {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    qty: "",
    unit: "g",
    food: "",
  };
}

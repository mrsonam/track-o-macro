import { parseGramsFromSegment, segmentLabelForMatch } from "@/lib/meals/parse-meal-grams";

export type ConversionSource =
  | "explicit_grams"
  | "curated"
  | "parsed_count"
  | "parsed_volume"
  | "label_serving"
  | "llm"
  | "user";

/** Canonical portion units shown in pickers (never food-specific phrases). */
export type GenericPortionUnitId =
  | "g"
  | "count"
  | "cup"
  | "tbsp"
  | "tsp"
  | "oz"
  | "ml"
  | "slice"
  | "serving";

export const GENERIC_PORTION_UNIT_LABELS: Record<GenericPortionUnitId, string> = {
  g: "g",
  count: "Count",
  cup: "Cup",
  tbsp: "Tbsp",
  tsp: "Tsp",
  oz: "oz",
  ml: "ml",
  slice: "Slice",
  serving: "Serving",
};

const DEFAULT_GRAMS_PER_UNIT: Record<GenericPortionUnitId, number> = {
  g: 1,
  count: 100,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  oz: 28.35,
  ml: 1,
  slice: 40,
  serving: 100,
};

export type ParsedNaturalPortion = {
  displayQuantity: number;
  displayUnit: string;
  displayLabel: string;
  grams: number;
  conversionSource: ConversionSource;
  assumption?: string;
};

export type PortionServingOption = {
  id: string;
  unit: GenericPortionUnitId;
  /** Dropdown label (generic unit name only). */
  label: string;
  gramsPerUnit: number;
  conversionSource: ConversionSource;
  /** Original label text (e.g. FatSecret), stored for assumptions only. */
  sourceDescription?: string;
};

type CuratedRule = {
  id: string;
  foodMatch: RegExp;
  defaultQuantity: number;
  portionUnit: GenericPortionUnitId;
  gramsEach: number;
  assumption: string;
};

const CURATED_RULES: CuratedRule[] = [
  {
    id: "egg",
    foodMatch: /\begg(s)?\b/i,
    defaultQuantity: 2,
    portionUnit: "count",
    gramsEach: 50,
    assumption: "Large egg about 50 g each",
  },
  {
    id: "bread_slice",
    foodMatch: /\b(bread|toast)\b/i,
    defaultQuantity: 1,
    portionUnit: "slice",
    gramsEach: 40,
    assumption: "Slice about 40 g",
  },
  {
    id: "banana",
    foodMatch: /\bbanana(s)?\b/i,
    defaultQuantity: 1,
    portionUnit: "count",
    gramsEach: 110,
    assumption: "Medium banana about 110 g peeled",
  },
  {
    id: "packet",
    foodMatch: /\b(packet|pack|pouch|sachet|ramen|noodle\s*cup|instant)\b/i,
    defaultQuantity: 1,
    portionUnit: "serving",
    gramsEach: 85,
    assumption: "One serving about 85 g (brand varies)",
  },
];

const COUNT_WORDS =
  /\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\b/i;
const COUNT_MAP: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  a: 1,
  an: 1,
};

const VOLUME_PATTERNS: Array<{
  re: RegExp;
  unit: GenericPortionUnitId;
  gramsPerUnit: number;
  assumption: string;
}> = [
  {
    re: /(\d+(?:\.\d+)?)\s*cups?\b/i,
    unit: "cup",
    gramsPerUnit: 240,
    assumption: "Cup about 240 ml (food varies)",
  },
  {
    re: /(\d+(?:\.\d+)?)\s*tbsp\b/i,
    unit: "tbsp",
    gramsPerUnit: 15,
    assumption: "Tablespoon about 15 g (food varies)",
  },
  {
    re: /(\d+(?:\.\d+)?)\s*tsp\b/i,
    unit: "tsp",
    gramsPerUnit: 5,
    assumption: "Teaspoon about 5 g (food varies)",
  },
  {
    re: /(\d+(?:\.\d+)?)\s*(?:ml|milliliters?)\b/i,
    unit: "ml",
    gramsPerUnit: 1,
    assumption: "1 ml about 1 g for water-like liquids",
  },
  {
    re: /(\d+(?:\.\d+)?)\s*(?:oz|ounces?)\b/i,
    unit: "oz",
    gramsPerUnit: 28.35,
    assumption: "Ounce about 28 g",
  },
];

const UNIT_ALIASES: Record<string, GenericPortionUnitId> = {
  g: "g",
  gram: "g",
  grams: "g",
  count: "count",
  qty: "count",
  quantity: "count",
  piece: "count",
  pieces: "count",
  each: "count",
  cup: "cup",
  cups: "cup",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  ml: "ml",
  slice: "slice",
  slices: "slice",
  serving: "serving",
  servings: "serving",
  packet: "serving",
  packets: "serving",
  pack: "serving",
  pouch: "serving",
};

export function normalizeGenericPortionUnit(
  raw: string,
): GenericPortionUnitId | null {
  const key = raw.trim().toLowerCase();
  return UNIT_ALIASES[key] ?? null;
}

export function formatDisplayLabel(
  qty: number,
  unit: GenericPortionUnitId | string,
  food?: string,
): string {
  const foodPart = food?.trim();
  const u = normalizeGenericPortionUnit(String(unit)) ?? null;

  if (u === "g") {
    return foodPart ? `${qty} g ${foodPart}` : `${qty} g`;
  }
  if (u === "count") {
    if (!foodPart) return String(qty);
    return qty === 1 ? foodPart : `${qty} ${foodPart}`;
  }
  if (u === "cup") {
    const cupLabel = qty === 1 ? "cup" : "cups";
    return foodPart ? `${qty} ${cupLabel} ${foodPart}` : `${qty} ${cupLabel}`;
  }
  if (u === "tbsp") {
    return foodPart ? `${qty} tbsp ${foodPart}` : `${qty} tbsp`;
  }
  if (u === "tsp") {
    return foodPart ? `${qty} tsp ${foodPart}` : `${qty} tsp`;
  }
  if (u === "oz") {
    return foodPart ? `${qty} oz ${foodPart}` : `${qty} oz`;
  }
  if (u === "ml") {
    return foodPart ? `${qty} ml ${foodPart}` : `${qty} ml`;
  }
  if (u === "slice") {
    const sliceLabel = qty === 1 ? "slice" : "slices";
    return foodPart ? `${qty} ${sliceLabel} ${foodPart}` : `${qty} ${sliceLabel}`;
  }
  if (u === "serving") {
    const servingLabel = qty === 1 ? "serving" : "servings";
    return foodPart
      ? `${qty} ${servingLabel} ${foodPart}`
      : `${qty} ${servingLabel}`;
  }

  return foodPart ? `${qty} ${unit} ${foodPart}` : `${qty} ${unit}`;
}

export function matchCuratedRule(text: string): CuratedRule | null {
  const t = text.toLowerCase();
  for (const rule of CURATED_RULES) {
    if (rule.foodMatch.test(t)) return rule;
  }
  return null;
}

function parseLeadingCount(segment: string): { qty: number; rest: string } | null {
  const trimmed = segment.trim();
  const numMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (numMatch) {
    const qty = Number(numMatch[1]);
    if (Number.isFinite(qty) && qty > 0) {
      return { qty, rest: numMatch[2]!.trim() };
    }
  }
  const wordMatch = trimmed.match(
    /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|a|an)\s+(.+)$/i,
  );
  if (wordMatch) {
    const word = wordMatch[1]!.toLowerCase();
    const qty = COUNT_MAP[word];
    if (qty != null) return { qty, rest: wordMatch[2]!.trim() };
  }
  return null;
}

/** Strip size words so "large eggs" does not become the unit. */
function foodPhraseForDisplay(rest: string, foodLabelHint?: string): string {
  const hint = foodLabelHint?.trim();
  if (hint) return hint;
  return rest
    .replace(
      /^(small|medium|large|extra[-\s]?large|jumbo)\s+/i,
      "",
    )
    .replace(/\b(packet|pack|pouch|sachet)\b/gi, "")
    .trim();
}

function inferGenericUnitFromDescription(desc: string): GenericPortionUnitId {
  const d = desc.toLowerCase();
  if (/\b\d+(\.\d+)?\s*g\b/.test(d) || /\bgrams?\b/.test(d)) return "g";
  if (/\bcups?\b/.test(d)) return "cup";
  if (/\btbsp\b|\btablespoons?\b/.test(d)) return "tbsp";
  if (/\btsp\b|\bteaspoons?\b/.test(d)) return "tsp";
  if (/\boz\b|\bounces?\b/.test(d)) return "oz";
  if (/\bml\b|\bmillilit/.test(d)) return "ml";
  if (/\bslices?\b/.test(d)) return "slice";
  if (/\begg(s)?\b/.test(d)) return "count";
  if (/\b(packet|pack|pouch|container|bar|piece|serving)\b/.test(d)) {
    return "serving";
  }
  return "serving";
}

/** Legacy FatSecret rows: { label, grams } without unit. */
type LegacyServingRow = {
  id: string;
  label: string;
  grams?: number;
  gramsPerUnit?: number;
  unit?: GenericPortionUnitId;
};

function gramsPerUnitFromLegacy(row: LegacyServingRow): number | null {
  const g = row.gramsPerUnit ?? row.grams;
  return g != null && Number.isFinite(g) && g > 0 ? g : null;
}

export function parseNaturalPortionFromSegment(
  segment: string,
  foodLabelHint?: string,
): ParsedNaturalPortion | null {
  const seg = segment.trim();
  if (!seg) return null;

  const explicitG = parseGramsFromSegment(seg);
  if (explicitG != null) {
    const food = segmentLabelForMatch(seg) || foodLabelHint?.trim() || "food";
    return {
      displayQuantity: explicitG,
      displayUnit: "g",
      displayLabel: formatDisplayLabel(explicitG, "g", food),
      grams: explicitG,
      conversionSource: "explicit_grams",
    };
  }

  for (const vol of VOLUME_PATTERNS) {
    const m = seg.match(vol.re);
    if (m) {
      const qty = Number(m[1]);
      if (!Number.isFinite(qty) || qty <= 0) continue;
      const grams = Math.round(qty * vol.gramsPerUnit * 10) / 10;
      const food = foodPhraseForDisplay(
        segmentLabelForMatch(seg.replace(vol.re, "")) || "",
        foodLabelHint,
      );
      return {
        displayQuantity: qty,
        displayUnit: vol.unit,
        displayLabel: formatDisplayLabel(qty, vol.unit, food || undefined),
        grams,
        conversionSource: "parsed_volume",
        assumption: vol.assumption,
      };
    }
  }

  const countParsed = parseLeadingCount(seg);
  if (countParsed) {
    const foodText = foodPhraseForDisplay(countParsed.rest, foodLabelHint);
    const rule =
      matchCuratedRule(countParsed.rest) ?? matchCuratedRule(foodLabelHint ?? "");
    if (rule) {
      const grams = Math.round(countParsed.qty * rule.gramsEach * 10) / 10;
      return {
        displayQuantity: countParsed.qty,
        displayUnit: rule.portionUnit,
        displayLabel: formatDisplayLabel(
          countParsed.qty,
          rule.portionUnit,
          foodText || foodLabelHint,
        ),
        grams,
        conversionSource: "curated",
        assumption: rule.assumption,
      };
    }
    const genericGrams = countParsed.qty * 100;
    return {
      displayQuantity: countParsed.qty,
      displayUnit: "count",
      displayLabel: formatDisplayLabel(
        countParsed.qty,
        "count",
        foodText || undefined,
      ),
      grams: genericGrams,
      conversionSource: "parsed_count",
      assumption: "Counted item, about 100 g each unless you specify grams",
    };
  }

  const ruleOnly = matchCuratedRule(seg) ?? matchCuratedRule(foodLabelHint ?? "");
  if (ruleOnly && foodLabelHint) {
    const qty = ruleOnly.defaultQuantity;
    const grams = Math.round(qty * ruleOnly.gramsEach * 10) / 10;
    return {
      displayQuantity: qty,
      displayUnit: ruleOnly.portionUnit,
      displayLabel: formatDisplayLabel(
        qty,
        ruleOnly.portionUnit,
        foodLabelHint,
      ),
      grams,
      conversionSource: "curated",
      assumption: ruleOnly.assumption,
    };
  }

  return null;
}

export function estimateGramsFromSegment(
  segment: string,
  foodLabelHint?: string,
): number | null {
  const parsed = parseNaturalPortionFromSegment(segment, foodLabelHint);
  return parsed?.grams ?? null;
}

export type DefaultServingHint = {
  qty: number;
  unit: string;
  grams?: number;
};

export function defaultLineForFoodPick(
  label: string,
  userDefault?: DefaultServingHint | null,
): string {
  const trimmed = label.trim();
  if (!trimmed) return "";
  if (userDefault && userDefault.qty > 0 && userDefault.unit.trim()) {
    const unit =
      normalizeGenericPortionUnit(userDefault.unit) ?? userDefault.unit.trim();
    return formatDisplayLabel(userDefault.qty, unit, trimmed);
  }
  const rule = matchCuratedRule(trimmed);
  if (rule) {
    return formatDisplayLabel(rule.defaultQuantity, rule.portionUnit, trimmed);
  }
  return trimmed;
}

export function suggestComposerDefaultsForFood(label: string): {
  unit: "g" | "count" | "slice" | "cup" | "pieces";
  qty: string;
} {
  const rule = matchCuratedRule(label.trim());
  if (!rule) return { unit: "g", qty: "" };
  if (rule.portionUnit === "slice") {
    return { unit: "slice", qty: String(rule.defaultQuantity) };
  }
  if (rule.portionUnit === "count" || rule.portionUnit === "serving") {
    return { unit: "count", qty: String(rule.defaultQuantity) };
  }
  return { unit: "g", qty: "" };
}

function makeOption(
  unit: GenericPortionUnitId,
  gramsPerUnit: number,
  conversionSource: ConversionSource,
  sourceDescription?: string,
  idSuffix?: string,
): PortionServingOption {
  return {
    id: `unit-${unit}${idSuffix ? `-${idSuffix}` : ""}`,
    unit,
    label: GENERIC_PORTION_UNIT_LABELS[unit],
    gramsPerUnit,
    conversionSource,
    ...(sourceDescription ? { sourceDescription } : {}),
  };
}

const PICKER_UNIT_ORDER: GenericPortionUnitId[] = [
  "count",
  "g",
  "serving",
  "slice",
  "cup",
  "tbsp",
  "tsp",
  "oz",
  "ml",
];

export function servingOptionsForFood(
  label: string,
  servings?: LegacyServingRow[],
  userDefault?: DefaultServingHint | null,
): PortionServingOption[] {
  const byUnit = new Map<GenericPortionUnitId, PortionServingOption>();

  function upsert(
    unit: GenericPortionUnitId,
    gramsPerUnit: number,
    conversionSource: ConversionSource,
    sourceDescription?: string,
    idSuffix?: string,
  ) {
    const existing = byUnit.get(unit);
    const next = makeOption(
      unit,
      gramsPerUnit,
      conversionSource,
      sourceDescription,
      idSuffix,
    );
    if (!existing) {
      byUnit.set(unit, next);
      return;
    }
    if (conversionSource === "label_serving" && existing.conversionSource !== "label_serving") {
      byUnit.set(unit, next);
    }
  }

  for (const unit of PICKER_UNIT_ORDER) {
    upsert(unit, DEFAULT_GRAMS_PER_UNIT[unit], "curated");
  }

  if (
    userDefault &&
    userDefault.qty > 0 &&
    userDefault.unit.trim() &&
    userDefault.grams != null &&
    userDefault.grams > 0
  ) {
    const unit =
      normalizeGenericPortionUnit(userDefault.unit) ?? "serving";
    upsert(
      unit,
      userDefault.grams / userDefault.qty,
      "user",
      undefined,
      "user-default",
    );
  }

  const rule = matchCuratedRule(label);
  if (rule) {
    upsert(rule.portionUnit, rule.gramsEach, "curated", rule.assumption, rule.id);
  }

  for (const s of servings ?? []) {
    const gpu = gramsPerUnitFromLegacy(s);
    if (gpu == null) continue;
    const unit = s.unit ?? inferGenericUnitFromDescription(s.label);
    upsert(unit, gpu, "label_serving", s.label, s.id);
  }

  return PICKER_UNIT_ORDER.filter((u) => byUnit.has(u)).map((u) => byUnit.get(u)!);
}

export function defaultServingOptionId(
  label: string,
  options: PortionServingOption[],
): string {
  const rule = matchCuratedRule(label);
  if (rule) {
    const match = options.find((o) => o.unit === rule.portionUnit);
    if (match) return match.id;
  }
  return options.find((o) => o.unit === "count")?.id ?? options[0]?.id ?? "unit-g";
}

export function portionFromServingOption(
  option: PortionServingOption,
  quantity: number,
  foodLabel: string,
): ParsedNaturalPortion {
  const grams = Math.round(option.gramsPerUnit * quantity * 10) / 10;
  const assumption =
    option.sourceDescription && option.conversionSource === "label_serving"
      ? `Database serving: ${option.sourceDescription}`
      : option.conversionSource === "curated"
        ? matchCuratedRule(foodLabel)?.assumption ?? "Average serving size"
        : option.conversionSource === "user"
          ? "Your saved default serving"
          : undefined;

  return {
    displayQuantity: quantity,
    displayUnit: option.unit,
    displayLabel: formatDisplayLabel(quantity, option.unit, foodLabel),
    grams,
    conversionSource: option.conversionSource,
    assumption,
  };
}

export function attachPortionToResolvedLine<
  T extends {
    label: string;
    quantity: number;
    unit: string;
    detail?: Record<string, unknown>;
  },
>(
  line: T,
  portion: ParsedNaturalPortion | null,
  unitNote?: string | null,
): T & {
  display_quantity?: number;
  display_unit?: string;
  display_label?: string;
  conversion_source?: ConversionSource;
  assumption?: string;
} {
  const display_label =
    portion?.displayLabel ??
    unitNote?.trim() ??
    (line.quantity > 0 && line.unit === "g"
      ? `${line.quantity} g ${line.label}`
      : line.label);
  return {
    ...line,
    display_quantity: portion?.displayQuantity,
    display_unit: portion?.displayUnit,
    display_label,
    conversion_source: portion?.conversionSource ?? (unitNote ? "llm" : undefined),
    assumption: portion?.assumption,
    detail: {
      ...(line.detail ?? {}),
      ...(unitNote?.trim() ? { unit_note: unitNote.trim() } : {}),
      ...(portion
        ? {
            display_quantity: portion.displayQuantity,
            display_unit: portion.displayUnit,
            display_label: portion.displayLabel,
            conversion_source: portion.conversionSource,
            ...(portion.assumption ? { assumption: portion.assumption } : {}),
          }
        : {}),
    },
  };
}

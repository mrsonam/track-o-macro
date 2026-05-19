import type { ParsedIngredientInput } from "@/lib/nutrition/resolve-ingredient";
import {
  estimateGramsFromSegment,
  parseNaturalPortionFromSegment,
} from "@/lib/meals/portion-resolve";

export { estimateGramsFromSegment } from "@/lib/meals/portion-resolve";

/** Parse explicit gram amount from a meal line or segment (e.g. "chicken 150g"). */
export function parseGramsFromSegment(seg: string): number | null {
  const m = seg.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Remove gram suffix and normalize whitespace for label matching. */
export function segmentLabelForMatch(seg: string): string {
  return seg
    .replace(/(\d+(?:\.\d+)?)\s*g\b/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeIngredientLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

export function splitMealIntoSegments(rawInput: string): string[] {
  const lines = rawInput
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length > 1) return lines;
  const line = rawInput.trim();
  if (!line) return [];
  return line
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function labelsOverlap(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a.includes(b) || b.includes(a)) return true;
  const aTokens = a.split(/\W+/).filter((t) => t.length >= 3);
  const bTokens = b.split(/\W+/).filter((t) => t.length >= 3);
  return aTokens.some((at) =>
    bTokens.some((bt) => at.includes(bt) || bt.includes(at)),
  );
}

function gramsForIngredientFromSegments(
  ing: ParsedIngredientInput,
  segments: string[],
): number | null {
  const names = [
    ing.name,
    ing.search_query ?? "",
  ]
    .map(normalizeIngredientLabel)
    .filter(Boolean);

  for (const seg of segments) {
    const grams =
      parseGramsFromSegment(seg) ?? estimateGramsFromSegment(seg, ing.name);
    if (grams == null) continue;
    const segLabel = segmentLabelForMatch(seg);
    for (const name of names) {
      if (labelsOverlap(segLabel, name)) return grams;
    }
  }
  return null;
}

/**
 * Prefer gram amounts written in rawInput over parser defaults (often 100 g).
 */
export function applyGramsFromRawInput(
  ingredients: ParsedIngredientInput[],
  rawInput: string,
): ParsedIngredientInput[] {
  const segments = splitMealIntoSegments(rawInput);
  if (segments.length === 0 || ingredients.length === 0) {
    return ingredients;
  }

  if (segments.length === ingredients.length) {
    return ingredients.map((ing, i) => {
      const seg = segments[i]!;
      const grams =
        parseGramsFromSegment(seg) ??
        estimateGramsFromSegment(seg, ing.name);
      const portion = parseNaturalPortionFromSegment(seg, ing.name);
      const unit_note = portion?.displayLabel ?? ing.unit_note;
      return grams != null ? { ...ing, quantity_g: grams, unit_note } : ing;
    });
  }

  return ingredients.map((ing) => {
    const grams =
      gramsForIngredientFromSegments(ing, segments) ??
      segments
        .map((seg) => estimateGramsFromSegment(seg, ing.name))
        .find((g) => g != null) ??
      null;
    return grams != null ? { ...ing, quantity_g: grams } : ing;
  });
}

export function fallbackParseIngredientsFromText(
  rawInput: string,
  defaultGrams = 100,
): {
  ingredients: ParsedIngredientInput[];
  assumptions: string[];
} {
  const segments = splitMealIntoSegments(rawInput);
  const usedDefault: string[] = [];

  const ingredients = segments.map((segment) => {
    const portion = parseNaturalPortionFromSegment(segment);
    const grams =
      portion?.grams ??
      parseGramsFromSegment(segment) ??
      estimateGramsFromSegment(segment);
    const name = segmentLabelForMatch(segment) || segment.trim();
    if (grams == null || portion == null) {
      usedDefault.push(name);
    }
    return {
      name,
      search_query: name,
      quantity_g: grams ?? defaultGrams,
      unit_note:
        portion?.displayLabel ??
        (grams != null ? "grams_from_user_text" : "fallback_parse"),
    };
  });

  const assumptions = [
    usedDefault.length > 0
      ? `No grams found for: ${usedDefault.join(", ")}. Used ${defaultGrams} g each.`
      : "Used gram amounts from your text.",
  ];

  return { ingredients, assumptions };
}

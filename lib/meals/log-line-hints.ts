import {
  estimateGramsFromSegment,
  parseGramsFromSegment,
} from "@/lib/meals/parse-meal-grams";

/** Match textarea padding + line height (text-lg, leading-relaxed). */
export const MEAL_LOG_TEXTAREA_PAD_TOP_PX = 16;
export const MEAL_LOG_TEXTAREA_LINE_HEIGHT_PX = 28;

export function mealLogLineHintTopPx(lineIndex: number): number {
  return MEAL_LOG_TEXTAREA_PAD_TOP_PX + lineIndex * MEAL_LOG_TEXTAREA_LINE_HEIGHT_PX;
}

export type FoodHintForLineMatch = {
  label: string;
  labelNorm: string;
  kcalPer100g: number;
};

export type LineHintChip = {
  key: string;
  lineIndex: number;
  grams: number | null;
  kcal: number | null;
  showChip: boolean;
};

function matchScore(lineNorm: string, hintNorm: string): number {
  if (!lineNorm || !hintNorm) return 0;
  if (lineNorm === hintNorm) return 100;
  if (lineNorm.includes(hintNorm) || hintNorm.includes(lineNorm)) {
    return Math.min(lineNorm.length, hintNorm.length);
  }
  const lineTokens = lineNorm.split(/\W+/).filter((t) => t.length >= 3);
  const hintTokens = hintNorm.split(/\W+/).filter((t) => t.length >= 3);
  const overlap = lineTokens.filter((st) =>
    hintTokens.some((ht) => ht.includes(st) || st.includes(ht)),
  ).length;
  return overlap > 0 ? 10 + overlap : 0;
}

/**
 * One chip slot per textarea line; kcal aligns with the line that owns the hint.
 */
export function buildLineHintChips(
  lines: string[],
  hints: FoodHintForLineMatch[],
): LineHintChip[] {
  if (lines.length === 0) return [];

  const usedHintNorms = new Set<string>();

  return lines.map((rawLine, lineIndex) => {
    const lineNorm = rawLine.toLowerCase().replace(/\s+/g, " ").trim();
    const grams =
      parseGramsFromSegment(rawLine) ?? estimateGramsFromSegment(rawLine);

    let best: FoodHintForLineMatch | null = null;
    let bestScore = 0;

    for (const hint of hints) {
      if (usedHintNorms.has(hint.labelNorm)) continue;
      const score = matchScore(lineNorm, hint.labelNorm);
      if (score > bestScore) {
        bestScore = score;
        best = hint;
      }
    }

    if (best && bestScore > 0) {
      usedHintNorms.add(best.labelNorm);
    }

    const showChip = best != null && bestScore > 0;
    const kcal =
      showChip && grams != null ? (best!.kcalPer100g * grams) / 100 : null;

    return {
      key: `line-${lineIndex}`,
      lineIndex,
      grams,
      kcal,
      showChip,
    };
  });
}

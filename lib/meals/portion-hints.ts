/**
 * Static reference for portion / volume → gram hints (rough averages).
 * Shown as guidance only — not medical or label-accurate.
 */

export type PortionHintRow = {
  item: string;
  grams: string;
  note?: string;
};

/** Common kitchen conversions (US-style volumes where noted). */
export const PORTION_VOLUME_HINTS: PortionHintRow[] = [
  { item: "1 cup (US)", grams: "~236–240 ml liquid; dry foods vary by food" },
  { item: "1 tbsp", grams: "~15 ml (liquids); ~14 g oils" },
  { item: "1 tsp", grams: "~5 ml" },
  { item: "1 oz (weight)", grams: "~28 g" },
];

export const PORTION_COMMON_FOODS: PortionHintRow[] = [
  { item: "Large egg (whole)", grams: "~50 g" },
  { item: "Slice bread", grams: "~35–45 g" },
  { item: "Banana (medium)", grams: "~100–120 g peeled" },
  { item: "Cooked chicken breast", grams: "~120 g per palm-sized piece (varies)" },
  { item: "Cooked white rice", grams: "~150–200 g per cup packed (varies)" },
  { item: "Plain Greek yogurt", grams: "~150 g per ½ cup (brand varies)" },
];

/** One-tap lines for free-text log (Epic 2 portion UX). Estimates only. */
export const PORTION_QUICK_SNIPPETS: { label: string; text: string }[] = [
  { label: "120 g chicken", text: "120 g chicken breast, cooked" },
  { label: "1 cup rice", text: "1 cup cooked rice" },
  { label: "2 eggs", text: "2 large eggs" },
  { label: "1 tbsp oil", text: "1 tbsp olive oil" },
  { label: "Medium banana", text: "1 medium banana" },
  { label: "Slice bread", text: "1 slice whole wheat bread" },
];

/**
 * Hand-size estimates — clearly labeled as rough guides (not personalized).
 */
export const PORTION_HAND_GUIDE =
  "Rough guides: palm of protein ~3–4 oz cooked meat; fist ~1 cup starch; thumb ~1 tbsp fat. These vary by hand size—use a scale when precision matters.";

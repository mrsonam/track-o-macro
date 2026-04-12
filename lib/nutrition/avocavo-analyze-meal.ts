import {
  analyzeFreeTextMeal,
  type AvocavoAnalyzeResultItem,
} from "./avocavo";
import {
  applyUserFoodOverridesToLines,
  type ResolvedLine,
  type UserFoodResolveInput,
} from "./resolve-ingredient";

export function lineFromAvocavoApiItem(
  item: AvocavoAnalyzeResultItem,
  phraseFallback: string,
): ResolvedLine | null {
  if (!item.success || !item.nutrition) return null;
  const n = item.nutrition;
  const kcal = n.calories ?? 0;
  if (kcal <= 0) return null;

  const grams = item.parsing?.estimated_grams;
  const hasGrams = typeof grams === "number" && grams > 0;
  const quantity = hasGrams ? Math.round(grams * 10) / 10 : 1;
  const unit = hasGrams ? "g" : "serving";

  const label =
    item.parsing?.ingredient_name?.trim() ||
    item.ingredient?.trim() ||
    phraseFallback;

  const fdcId = item.metadata?.usda_match?.fdc_id ?? null;
  const desc = item.metadata?.usda_match?.description;

  return {
    label,
    quantity,
    unit,
    kcal: Math.round(kcal * 10) / 10,
    protein_g: Math.round((n.protein ?? 0) * 10) / 10,
    carbs_g: Math.round((n.carbohydrates ?? 0) * 10) / 10,
    fat_g: Math.round((n.total_fat ?? 0) * 10) / 10,
    fdc_id: fdcId != null ? fdcId : null,
    source: fdcId != null ? "fdc" : "estimate",
    detail: {
      provider: "avocavo",
      avocavo_phrase: item.ingredient ?? phraseFallback,
      fdc_description: desc,
      usda_link: item.metadata?.usda_link,
      match_quality: item.metadata?.match_quality,
      avocavo_confidence: item.metadata?.confidence,
      parse_via: "avocavo_analyze",
    },
  };
}

/**
 * Full meal analysis using only Avocavo `/analyze` (no OpenAI).
 * Use when `OPENAI_API_KEY` is unset.
 */
export async function analyzeMealViaAvocavoFreeText(
  rawInput: string,
  options?: { userFoods?: UserFoodResolveInput[] },
): Promise<{
  lines: ResolvedLine[];
  meal_label?: string;
  assumptions: string[];
}> {
  const data = await analyzeFreeTextMeal(rawInput);
  if (!data.success) {
    const msg = data.message ?? data.error ?? "Avocavo analyze was not successful";
    throw new Error(msg);
  }

  const results = data.results ?? [];
  if (results.length === 0) {
    throw new Error(
      "No ingredients were detected. Try listing foods with amounts (e.g. 2 eggs, 1 cup rice).",
    );
  }

  const lines: ResolvedLine[] = [];
  const assumptions: string[] = [
    "Ingredient split and nutrition from Avocavo (no OpenAI on this server).",
  ];

  for (let i = 0; i < results.length; i++) {
    const item = results[i]!;
    const phrase =
      data.extracted_ingredients?.[i]?.trim() ||
      item.ingredient?.trim() ||
      `item ${i + 1}`;

    const line = lineFromAvocavoApiItem(item, phrase);
    if (line) {
      lines.push(line);
      continue;
    }

    if (!item.success && item.error) {
      assumptions.push(`Skipped line (“${phrase}”): ${item.error}`);
      continue;
    }

    assumptions.push(`Skipped line (“${phrase}”): no usable nutrition data.`);
  }

  if (lines.length === 0) {
    throw new Error(
      "Could not get nutrition for any part of this meal. Try simpler wording or smaller portions per line.",
    );
  }

  const merged =
    options?.userFoods?.length && options.userFoods.length > 0
      ? applyUserFoodOverridesToLines(lines, options.userFoods)
      : lines;

  return { lines: merged, assumptions };
}

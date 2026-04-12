import { analyzeMealViaAvocavoFreeText } from "@/lib/nutrition/avocavo-analyze-meal";
import { parseMealDescription } from "@/lib/nutrition/parse-meal";
import { resolveIngredientLines } from "@/lib/nutrition/resolve-ingredient";
import type {
  ResolvedLine,
  UserFoodResolveInput,
} from "@/lib/nutrition/resolve-ingredient";

export type AnalyzedMealResult = {
  lines: ResolvedLine[];
  meal_label?: string;
  assumptions?: string[] | undefined;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
};

export type AnalyzeMealTextOptions = {
  /** Saved foods (per 100 g). Matched by normalized ingredient name; overrides USDA/estimate. */
  userFoods?: UserFoodResolveInput[];
};

/** Parse + resolve nutrition for meal text (OpenAI path or Avocavo-only). */
export async function analyzeMealText(
  rawInput: string,
  options?: AnalyzeMealTextOptions,
): Promise<AnalyzedMealResult> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error("Meal text is empty");
  }

  const useOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());

  let lines: ResolvedLine[];
  let meal_label: string | undefined;
  let assumptions: string[] | undefined;

  if (useOpenAi) {
    const parsed = await parseMealDescription(trimmed);
    lines = await resolveIngredientLines(parsed.ingredients, {
      userFoods: options?.userFoods,
    });
    meal_label = parsed.meal_label;
    assumptions = parsed.assumptions;
  } else {
    const av = await analyzeMealViaAvocavoFreeText(trimmed, {
      userFoods: options?.userFoods,
    });
    lines = av.lines;
    meal_label = av.meal_label;
    assumptions = av.assumptions;
  }

  const total_kcal = lines.reduce((s, l) => s + l.kcal, 0);
  const total_protein = lines.reduce((s, l) => s + l.protein_g, 0);
  const total_carbs = lines.reduce((s, l) => s + l.carbs_g, 0);
  const total_fat = lines.reduce((s, l) => s + l.fat_g, 0);

  return {
    lines,
    meal_label,
    assumptions,
    totals: {
      kcal: Math.round(total_kcal * 10) / 10,
      protein_g: Math.round(total_protein * 10) / 10,
      carbs_g: Math.round(total_carbs * 10) / 10,
      fat_g: Math.round(total_fat * 10) / 10,
    },
  };
}

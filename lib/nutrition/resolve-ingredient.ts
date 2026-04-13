import { batchAnalyzeIngredients, maxBatchSize, singleIngredientAnalyze } from "./avocavo";
import { lineFromAvocavoApiItem } from "./avocavo-analyze-meal";
import { sugarsFromAvocavoNutrition } from "./avocavo-sugars";
import { estimateIngredientNutrition } from "./parse-meal";

export type ResolvedLine = {
  label: string;
  quantity: number;
  unit: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sodium_mg?: number;
  sugar_g?: number;
  /** Present when resolver supplies added sugars; otherwise omitted */
  added_sugar_g?: number;
  fdc_id: number | null;
  source: "fdc" | "estimate" | "custom";
  detail: Record<string, unknown>;
};

export type ParsedIngredientInput = {
  name: string;
  quantity_g: number;
  search_query?: string;
  unit_note?: string;
};

/** Serializable row from `UserFood` for analyze routes. */
export type UserFoodResolveInput = {
  id: string;
  label: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodiumPer100g?: number;
  sugarPer100g?: number;
  version: number;
};

export function normalizeFoodLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findMatchingUserFood(
  ing: ParsedIngredientInput,
  foods: UserFoodResolveInput[],
): UserFoodResolveInput | null {
  if (foods.length === 0) return null;
  const keys = new Set<string>();
  keys.add(normalizeFoodLabel(ing.name));
  if (ing.search_query?.trim()) {
    keys.add(normalizeFoodLabel(ing.search_query));
  }
  for (const f of foods) {
    if (keys.has(normalizeFoodLabel(f.label))) return f;
  }
  return null;
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

export function lineFromUserFood(
  ing: ParsedIngredientInput,
  uf: UserFoodResolveInput,
): ResolvedLine {
  const g = ing.quantity_g;
  const factor = g / 100;
  return {
    label: ing.name,
    quantity: g,
    unit: "g",
    kcal: round1(uf.kcalPer100g * factor),
    protein_g: round1(uf.proteinPer100g * factor),
    carbs_g: round1(uf.carbsPer100g * factor),
    fat_g: round1(uf.fatPer100g * factor),
    fiber_g: uf.fiberPer100g ? round1(uf.fiberPer100g * factor) : undefined,
    sodium_mg: uf.sodiumPer100g ? round1(uf.sodiumPer100g * factor) : undefined,
    sugar_g: uf.sugarPer100g ? round1(uf.sugarPer100g * factor) : undefined,
    fdc_id: null,
    source: "custom",
    detail: {
      user_food_id: uf.id,
      user_food_version: uf.version,
      conflict_resolution: "user_food_wins",
      note: "Uses your saved food (per 100 g) instead of USDA or estimate.",
      ...(ing.unit_note?.trim()
        ? { unit_note: ing.unit_note.trim() }
        : {}),
    },
  };
}

/**
 * When Avocavo returns lines with grams, override matching labels with user foods.
 */
export function applyUserFoodOverridesToLines(
  lines: ResolvedLine[],
  foods: UserFoodResolveInput[],
): ResolvedLine[] {
  if (foods.length === 0) return lines;
  return lines.map((line) => {
    if (line.unit !== "g" || !(line.quantity > 0)) return line;
    let matched: UserFoodResolveInput | null = null;
    const labelKey = normalizeFoodLabel(line.label);
    for (const f of foods) {
      if (normalizeFoodLabel(f.label) === labelKey) {
        matched = f;
        break;
      }
    }
    if (!matched) return line;

    const g = line.quantity;
    const factor = g / 100;
    const prevSource = line.source;
    const prevFdc = line.fdc_id;

    return {
      ...line,
      kcal: round1(matched.kcalPer100g * factor),
      protein_g: round1(matched.proteinPer100g * factor),
      carbs_g: round1(matched.carbsPer100g * factor),
      fat_g: round1(matched.fatPer100g * factor),
      fiber_g: matched.fiberPer100g ? round1(matched.fiberPer100g * factor) : undefined,
      sodium_mg: matched.sodiumPer100g ? round1(matched.sodiumPer100g * factor) : undefined,
      sugar_g: matched.sugarPer100g ? round1(matched.sugarPer100g * factor) : undefined,
      fdc_id: null,
      source: "custom",
      detail: {
        ...line.detail,
        user_food_id: matched.id,
        user_food_version: matched.version,
        conflict_resolution: "user_food_wins",
        overridden_from: prevSource,
        previous_fdc_id: prevFdc,
        note: "Your saved food overrode USDA/estimate for this line.",
      },
    };
  });
}

/** Natural-language line for Avocavo (grams + food phrase from the parser). */
export function ingredientPhraseForAvocavo(input: ParsedIngredientInput): string {
  const q = Math.round(input.quantity_g * 100) / 100;
  const base = (input.search_query ?? input.name).trim();
  let s = `${q}g ${base}`;
  if (input.unit_note?.trim()) {
    s += ` (${input.unit_note.trim()})`;
  }
  return s;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export async function resolveIngredientLine(
  input: ParsedIngredientInput,
  options?: { userFoods?: UserFoodResolveInput[] },
): Promise<ResolvedLine> {
  const lines = await resolveIngredientLines([input], options);
  return lines[0]!;
}

async function resolveRemoteIngredientLines(
  ingredients: ParsedIngredientInput[],
): Promise<ResolvedLine[]> {
  const max = maxBatchSize();
  const phrases = ingredients.map(ingredientPhraseForAvocavo);
  const results: ResolvedLine[] = [];

  for (const group of chunk(
    ingredients.map((ing, i) => ({ ing, phrase: phrases[i]! })),
    max,
  )) {
    const subPhrases = group.map((g) => g.phrase);
    let batch: Awaited<ReturnType<typeof batchAnalyzeIngredients>>;
    try {
      batch = await batchAnalyzeIngredients(subPhrases);
    } catch (e) {
      for (const { ing } of group) {
        results.push(
          await fallbackEstimate(ing, {
            avocavo_error: e instanceof Error ? e.message : String(e),
          }),
        );
      }
      continue;
    }

    const items = batch.results ?? [];
    for (let j = 0; j < group.length; j++) {
      const { ing, phrase } = group[j]!;
      const item = items[j];
      if (!item || !item.success || !item.nutrition) {
        results.push(
          await fallbackEstimate(ing, {
            avocavo: "item_failed",
            phrase,
            avocavo_error: item?.error ?? "missing_result",
          }),
        );
        continue;
      }

      const n = item.nutrition;
      const kcal = n.calories ?? 0;
      if (kcal <= 0) {
        results.push(
          await fallbackEstimate(ing, {
            avocavo: "no_calories",
            phrase,
          }),
        );
        continue;
      }

      const fdcId = item.metadata?.usda_match?.fdc_id ?? null;
      const desc = item.metadata?.usda_match?.description;

      const { sugar_g, added_sugar_g } = sugarsFromAvocavoNutrition(n);

      results.push({
        label: ing.name,
        quantity: ing.quantity_g,
        unit: "g",
        kcal: Math.round(kcal * 10) / 10,
        protein_g: Math.round((n.protein ?? 0) * 10) / 10,
        carbs_g: Math.round((n.carbohydrates ?? 0) * 10) / 10,
        fat_g: Math.round((n.total_fat ?? 0) * 10) / 10,
        fiber_g: n.fiber != null ? Math.round(n.fiber * 10) / 10 : undefined,
        sodium_mg: n.sodium != null ? Math.round(n.sodium) : undefined,
        sugar_g,
        ...(added_sugar_g != null ? { added_sugar_g } : {}),
        fdc_id: fdcId != null ? fdcId : null,
        source: fdcId != null ? "fdc" : "estimate",
        detail: {
          provider: "avocavo",
          avocavo_phrase: phrase,
          fdc_description: desc,
          usda_link: item.metadata?.usda_link,
          match_quality: item.metadata?.match_quality,
          avocavo_confidence: item.metadata?.confidence,
          unit_note: ing.unit_note,
        },
      });
    }
  }

  return results;
}

export async function resolveIngredientLines(
  ingredients: ParsedIngredientInput[],
  options?: { userFoods?: UserFoodResolveInput[] },
): Promise<ResolvedLine[]> {
  const foods = options?.userFoods ?? [];
  if (foods.length === 0) {
    return resolveRemoteIngredientLines(ingredients);
  }

  const out: ResolvedLine[] = [];
  let i = 0;
  while (i < ingredients.length) {
    const ing = ingredients[i]!;
    const matched = findMatchingUserFood(ing, foods);
    if (matched) {
      out.push(lineFromUserFood(ing, matched));
      i++;
      continue;
    }
    const run: ParsedIngredientInput[] = [];
    while (i < ingredients.length && !findMatchingUserFood(ingredients[i]!, foods)) {
      run.push(ingredients[i]!);
      i++;
    }
    out.push(...(await resolveRemoteIngredientLines(run)));
  }
  return out;
}

async function fallbackEstimate(
  input: {
    name: string;
    quantity_g: number;
    unit_note?: string;
  },
  detail: Record<string, unknown>,
): Promise<ResolvedLine> {
  if (process.env.OPENAI_API_KEY?.trim()) {
    const est = await estimateIngredientNutrition({
      name: input.name,
      quantity_g: input.quantity_g,
      unit_note: input.unit_note,
    });

    return {
      label: input.name,
      quantity: input.quantity_g,
      unit: "g",
      kcal: Math.round(est.estimated_kcal * 10) / 10,
      protein_g: est.protein_g ?? 0,
      carbs_g: est.carbs_g ?? 0,
      fat_g: est.fat_g ?? 0,
      fiber_g: est.fiber_g,
      sodium_mg: est.sodium_mg,
      sugar_g: est.sugar_g,
      fdc_id: null,
      source: "estimate",
      detail: {
        ...detail,
        confidence: est.confidence,
        reasoning: est.reasoning,
        ...(input.unit_note?.trim()
          ? { unit_note: input.unit_note.trim() }
          : {}),
      },
    };
  }

  const phrase = ingredientPhraseForAvocavo({
    name: input.name,
    quantity_g: input.quantity_g,
    unit_note: input.unit_note,
  });

  try {
    const item = await singleIngredientAnalyze(phrase);
    const line = lineFromAvocavoApiItem(item, phrase);
    if (line) {
      return {
        ...line,
        detail: {
          ...line.detail,
          ...detail,
          ...(input.unit_note?.trim()
            ? { unit_note: input.unit_note.trim() }
            : {}),
        },
      };
    }
  } catch {
    /* rough fallback below */
  }

  const rough = Math.max(1, Math.round(input.quantity_g * 2));
  return {
    label: input.name,
    quantity: input.quantity_g,
    unit: "g",
    kcal: rough,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fdc_id: null,
    source: "estimate",
    detail: {
      ...detail,
      ...(input.unit_note?.trim()
        ? { unit_note: input.unit_note.trim() }
        : {}),
      confidence: "low",
      reasoning:
        "Rough placeholder (~2 kcal per gram of food) — Avocavo had no match and OpenAI is not configured.",
      rough_fallback: true,
    },
  };
}

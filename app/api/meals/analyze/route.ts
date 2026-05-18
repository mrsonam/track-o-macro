import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isOnboardingComplete } from "@/lib/profile/require-onboarding";
import { loadUserFoodsForResolve } from "@/lib/meals/load-user-foods";
import { prismaLineCreates } from "@/lib/meals/line-items-create";
import { isDbUnavailableError } from "@/lib/db-errors";
import {
  findMatchingUserFood,
  lineFromUserFood,
  type ParsedIngredientInput,
  type ResolvedLine,
  type UserFoodResolveInput,
} from "@/lib/nutrition/resolve-ingredient";
import { parseMealDescription } from "@/lib/nutrition/parse-meal";
import { fatSecretSearchFoods, hasFatSecretCredentials } from "@/lib/nutrition/fatsecret";
import { singleIngredientAnalyze } from "@/lib/nutrition/avocavo";
import { lineFromAvocavoApiItem } from "@/lib/nutrition/avocavo-analyze-meal";
import {
  applyGramsFromRawInput,
  fallbackParseIngredientsFromText,
  parseGramsFromSegment,
  segmentLabelForMatch,
  splitMealIntoSegments,
} from "@/lib/meals/parse-meal-grams";

export const maxDuration = 60;
const FATSECRET_ANALYSIS_PORTION_G = 100;

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function fallbackParseIngredients(rawInput: string): {
  ingredients: ParsedIngredientInput[];
  assumptions: string[];
} {
  return fallbackParseIngredientsFromText(rawInput, FATSECRET_ANALYSIS_PORTION_G);
}

async function buildFatSecretLine(
  ing: ParsedIngredientInput,
): Promise<ResolvedLine> {
  const results = await fatSecretSearchFoods(ing.search_query ?? ing.name, 5);
  const top = results[0];
  if (!top) {
    return {
      label: ing.name,
      quantity: ing.quantity_g,
      unit: "g",
      kcal: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fdc_id: null,
      source: "estimate",
      detail: {
        provider: "fatsecret",
        reason: "no_match",
      },
    };
  }
  const factor = ing.quantity_g / 100;
  return {
    label: ing.name,
    quantity: ing.quantity_g,
    unit: "g",
    kcal: round1((top.kcalPer100g ?? 0) * factor),
    protein_g: round1((top.proteinPer100g ?? 0) * factor),
    carbs_g: round1((top.carbsPer100g ?? 0) * factor),
    fat_g: round1((top.fatPer100g ?? 0) * factor),
    fdc_id: top.fdcId,
    source: "fdc",
    detail: {
      provider: "fatsecret",
      matched_label: top.label,
      per100g: {
        kcal: top.kcalPer100g,
        protein_g: top.proteinPer100g,
        carbs_g: top.carbsPer100g,
        fat_g: top.fatPer100g,
      },
      ...(ing.unit_note?.trim() ? { unit_note: ing.unit_note.trim() } : {}),
    },
  };
}

async function resolveIngredientLine(
  ing: ParsedIngredientInput,
): Promise<ResolvedLine> {
  if (hasFatSecretCredentials()) {
    try {
      return await buildFatSecretLine(ing);
    } catch (e) {
      console.error("[analyze] FatSecret failed for ingredient:", ing.name, e);
    }
  }

  if (process.env.AVOCAVO_API_KEY?.trim()) {
    try {
      const phrase =
        `${ing.quantity_g}g ${(ing.search_query ?? ing.name).trim()}`.trim();
      const item = await singleIngredientAnalyze(phrase);
      const line = lineFromAvocavoApiItem(item, phrase);
      if (line && line.quantity > 0) {
        const scale = ing.quantity_g / line.quantity;
        if (Number.isFinite(scale) && scale > 0) {
          return {
            ...line,
            label: ing.name,
            quantity: ing.quantity_g,
            unit: "g",
            kcal: round1(line.kcal * scale),
            protein_g: round1(line.protein_g * scale),
            carbs_g: round1(line.carbs_g * scale),
            fat_g: round1(line.fat_g * scale),
            fiber_g:
              line.fiber_g != null ? round1(line.fiber_g * scale) : undefined,
            sodium_mg:
              line.sodium_mg != null
                ? Math.round(line.sodium_mg * scale)
                : undefined,
            sugar_g:
              line.sugar_g != null ? round1(line.sugar_g * scale) : undefined,
            added_sugar_g:
              line.added_sugar_g != null
                ? round1(line.added_sugar_g * scale)
                : undefined,
          };
        }
      }
    } catch (e) {
      console.error("[analyze] Avocavo failed for ingredient:", ing.name, e);
    }
  }

  return {
    label: ing.name,
    quantity: ing.quantity_g,
    unit: "g",
    kcal: 0,
    protein_g: 0,
    carbs_g: 0,
    fat_g: 0,
    fdc_id: null,
    source: "estimate",
    detail: {
      provider: "none",
      reason: "no_nutrition_provider",
      ...(ing.unit_note?.trim() ? { unit_note: ing.unit_note.trim() } : {}),
    },
  };
}

function sumTotals(lines: ResolvedLine[]) {
  const kcal = lines.reduce((s, l) => s + l.kcal, 0);
  const protein = lines.reduce((s, l) => s + l.protein_g, 0);
  const carbs = lines.reduce((s, l) => s + l.carbs_g, 0);
  const fat = lines.reduce((s, l) => s + l.fat_g, 0);
  const fiber = lines.reduce((s, l) => s + (l.fiber_g ?? 0), 0);
  const sodium = lines.reduce((s, l) => s + (l.sodium_mg ?? 0), 0);
  const sugar = lines.reduce((s, l) => s + (l.sugar_g ?? 0), 0);
  const addedSugar = lines.reduce((s, l) => s + (l.added_sugar_g ?? 0), 0);
  const anyAddedSugar = lines.some((l) => l.added_sugar_g != null);
  return {
    kcal: round1(kcal),
    protein_g: round1(protein),
    carbs_g: round1(carbs),
    fat_g: round1(fat),
    fiber_g: round1(fiber),
    sodium_mg: Math.round(sodium),
    sugar_g: round1(sugar),
    added_sugar_g: anyAddedSugar ? round1(addedSugar) : null,
  };
}

function resolveLabelNormInSegment(seg: string) {
  return seg.toLowerCase().replace(/\s+/g, " ").trim();
}

function findHintForSegment(
  seg: string,
  hints: UserFoodResolveInput[],
): UserFoodResolveInput | undefined {
  const segLabel = segmentLabelForMatch(seg);
  if (!segLabel) return undefined;

  let best: UserFoodResolveInput | undefined;
  let bestScore = 0;

  for (const hint of hints) {
    const hintNorm = resolveLabelNormInSegment(hint.label);
    let score = 0;
    if (segLabel === hintNorm) {
      score = 100;
    } else if (segLabel.includes(hintNorm) || hintNorm.includes(segLabel)) {
      score = Math.min(segLabel.length, hintNorm.length);
    } else {
      const segTokens = segLabel.split(/\W+/).filter((t) => t.length >= 3);
      const hintTokens = hintNorm.split(/\W+/).filter((t) => t.length >= 3);
      const overlap = segTokens.filter((st) =>
        hintTokens.some((ht) => ht.includes(st) || st.includes(ht)),
      ).length;
      if (overlap > 0) score = 10 + overlap;
    }
    if (score > bestScore) {
      bestScore = score;
      best = hint;
    }
  }

  return bestScore > 0 ? best : undefined;
}

type AvocavoMicrosPer100g = {
  fiber_g_per100g?: number;
  sodium_mg_per100g?: number;
  sugar_g_per100g?: number;
  added_sugar_g_per100g?: number;
};

async function fetchAvocavoMicrosPer100g(
  label: string,
): Promise<AvocavoMicrosPer100g | null> {
  try {
    const phrase = `100g ${label}`;
    const item = await singleIngredientAnalyze(phrase);
    const line = lineFromAvocavoApiItem(item, phrase);
    if (!line || line.unit !== "g" || !(line.quantity > 0)) return null;

    const grams = line.quantity;
    const factor = 100 / grams;
    return {
      fiber_g_per100g:
        line.fiber_g != null ? round1(line.fiber_g * factor) : undefined,
      sodium_mg_per100g:
        line.sodium_mg != null
          ? Math.round(line.sodium_mg * factor)
          : undefined,
      sugar_g_per100g:
        line.sugar_g != null ? round1(line.sugar_g * factor) : undefined,
      added_sugar_g_per100g:
        line.added_sugar_g != null
          ? round1(line.added_sugar_g * factor)
          : undefined,
    };
  } catch {
    return null;
  }
}

async function enrichLinesWithAvocavoMicrosFromLabels(
  lines: ResolvedLine[],
): Promise<ResolvedLine[]> {
  const distinct = new Map<string, string>(); // labelNorm -> label
  for (const l of lines) {
    const labelNorm = resolveLabelNormInSegment(l.label);
    if (!distinct.has(labelNorm)) distinct.set(labelNorm, l.label);
  }

  // Only enrich when micros are missing.
  const needs =
    lines.some((l) => l.fiber_g == null || l.sodium_mg == null || l.sugar_g == null);
  if (!needs || distinct.size === 0) return lines;

  const per100Cache = new Map<string, AvocavoMicrosPer100g | null>();
  for (const [labelNorm, label] of distinct.entries()) {
    if (!per100Cache.has(labelNorm)) {
      per100Cache.set(labelNorm, await fetchAvocavoMicrosPer100g(label));
    }
  }

  return lines.map((l) => {
    const labelNorm = resolveLabelNormInSegment(l.label);
    const per100 = per100Cache.get(labelNorm);
    if (!per100) return l;
    if (!(l.quantity > 0)) return l;
    const factor = l.quantity / 100;

    return {
      ...l,
      fiber_g:
        per100.fiber_g_per100g != null
          ? round1(per100.fiber_g_per100g * factor)
          : l.fiber_g,
      sodium_mg:
        per100.sodium_mg_per100g != null
          ? Math.round(per100.sodium_mg_per100g * factor)
          : l.sodium_mg,
      sugar_g:
        per100.sugar_g_per100g != null
          ? round1(per100.sugar_g_per100g * factor)
          : l.sugar_g,
      ...(per100.added_sugar_g_per100g != null
        ? {
            added_sugar_g: round1(per100.added_sugar_g_per100g * factor),
          }
        : {}),
      detail: {
        ...l.detail,
        ...(per100.fiber_g_per100g != null ||
        per100.sodium_mg_per100g != null ||
        per100.sugar_g_per100g != null
          ? {
              micros_provider: "avocavo",
            }
          : {}),
      },
    };
  });
}

function tryResolveFromSelectedFoodHints(
  rawInput: string,
  hints: UserFoodResolveInput[],
): { lines: ResolvedLine[]; totals: ReturnType<typeof sumTotals> } | null {
  if (hints.length === 0) return null;

  const segments = splitMealIntoSegments(rawInput);
  if (segments.length === 0) return null;

  const lines: ResolvedLine[] = [];
  for (const seg of segments) {
    const grams = parseGramsFromSegment(seg);
    if (grams == null) return null;

    const hint = findHintForSegment(seg, hints);
    if (!hint) return null;

    const factor = grams / 100;
    lines.push({
      label: hint.label,
      quantity: grams,
      unit: "g",
      kcal: round1(hint.kcalPer100g * factor),
      protein_g: round1(hint.proteinPer100g * factor),
      carbs_g: round1(hint.carbsPer100g * factor),
      fat_g: round1(hint.fatPer100g * factor),
      ...(hint.fiberPer100g != null
        ? { fiber_g: round1(hint.fiberPer100g * factor) }
        : {}),
      ...(hint.sodiumPer100g != null
        ? { sodium_mg: Math.round(hint.sodiumPer100g * factor) }
        : {}),
      ...(hint.sugarPer100g != null
        ? { sugar_g: round1(hint.sugarPer100g * factor) }
        : {}),
      fdc_id: null,
      source: "custom",
      detail: {
        provider: "client_hints",
        grams,
        per100g: {
          kcal: hint.kcalPer100g,
          protein_g: hint.proteinPer100g,
          carbs_g: hint.carbsPer100g,
          fat_g: hint.fatPer100g,
          fiber_g: hint.fiberPer100g,
          sodium_mg: hint.sodiumPer100g,
          sugar_g: hint.sugarPer100g,
        },
      },
    });
  }

  return { lines, totals: sumTotals(lines) };
}

function jsonError(
  error: string,
  status: number,
  code?: string,
): NextResponse {
  return NextResponse.json(
    code ? { error, code } : { error },
    { status },
  );
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.id) {
      return jsonError("Unauthorized", 401);
    }
    const userId = session.user.id;

    let onboardingComplete: boolean;
    try {
      onboardingComplete = await isOnboardingComplete(userId);
    } catch (e) {
      if (isDbUnavailableError(e)) {
        return jsonError(
          "Database temporarily unavailable",
          503,
          "DATABASE_UNAVAILABLE",
        );
      }
      const message =
        e instanceof Error ? e.message : "Could not verify onboarding status";
      return jsonError(message, 500, "ONBOARDING_CHECK_FAILED");
    }

    if (!onboardingComplete) {
      return jsonError(
        "Complete onboarding first",
        403,
        "ONBOARDING_REQUIRED",
      );
    }

    let body: {
      rawInput?: string;
      /** When false, returns nutrition without creating a Meal row (for batch preview). */
      persist?: boolean;
      selectedFoodHints?: Array<{
        label?: string;
        labelNorm?: string;
        fdcId?: number;
        kcalPer100g?: number;
        proteinPer100g?: number;
        carbsPer100g?: number;
        fatPer100g?: number;
        fiberPer100g?: number;
        sodiumPer100g?: number;
        sugarPer100g?: number;
        addedSugarPer100g?: number;
      }>;
    };
    try {
      body = await request.json();
    } catch {
      return jsonError("Invalid JSON", 400, "INVALID_JSON");
    }

    const rawInput = body.rawInput?.trim();
    if (!rawInput) {
      return jsonError("rawInput is required", 400, "VALIDATION_REQUIRED");
    }

    const persist = body.persist !== false;

    const selectedFoodHints: UserFoodResolveInput[] = Array.isArray(
      body.selectedFoodHints,
    )
      ? body.selectedFoodHints
          .map((hint, index) => {
            const label = hint.label?.trim() ?? "";
            const kcal = Number(hint.kcalPer100g);
            const protein = Number(hint.proteinPer100g);
            const carbs = Number(hint.carbsPer100g);
            const fat = Number(hint.fatPer100g);
            const fiber = Number(hint.fiberPer100g);
            const sodium = Number(hint.sodiumPer100g);
            const sugar = Number(hint.sugarPer100g);
            if (!label) return null;
            if (![kcal, protein, carbs, fat].every(Number.isFinite)) return null;
            return {
              id: `selected-${index}-${label.toLowerCase().replace(/\s+/g, "-")}`,
              label,
              kcalPer100g: kcal,
              proteinPer100g: protein,
              carbsPer100g: carbs,
              fatPer100g: fat,
              ...(Number.isFinite(fiber) ? { fiberPer100g: fiber } : {}),
              ...(Number.isFinite(sodium) ? { sodiumPer100g: sodium } : {}),
              ...(Number.isFinite(sugar) ? { sugarPer100g: sugar } : {}),
              version: 1,
            } satisfies UserFoodResolveInput;
          })
          .filter((item): item is UserFoodResolveInput => item != null)
      : [];

    try {
      // Optimization: if the client already inserted "<label> <grams>g"
      // and sent per-100g macros, compute nutrition directly without
      // re-parsing with LLM or calling nutrition APIs.
      const fromClient = tryResolveFromSelectedFoodHints(
        rawInput,
        selectedFoodHints,
      );
      if (fromClient) {
        const enrichedLines =
          await enrichLinesWithAvocavoMicrosFromLabels(fromClient.lines);
        const totals = sumTotals(enrichedLines);
        if (!persist) {
          return NextResponse.json({
            mealId: null,
            meal_label: undefined,
            assumptions: undefined,
            lines: enrichedLines,
            totals,
          });
        }
        const meal = await prisma.meal.create({
          data: {
            userId,
            rawInput,
            totalKcal: totals.kcal,
            totalProteinG: totals.protein_g,
            totalCarbsG: totals.carbs_g,
            totalFatG: totals.fat_g,
            totalFiberG: totals.fiber_g,
            totalSodiumMg: totals.sodium_mg,
            totalSugarG: totals.sugar_g,
            totalAddedSugarG: totals.added_sugar_g,
            lineItems: {
              create: prismaLineCreates(enrichedLines, undefined, null),
            },
          },
          select: { id: true },
        });

        return NextResponse.json({
          mealId: meal.id,
          meal_label: undefined,
          assumptions: undefined,
          lines: enrichedLines,
          totals,
        });
      }

      const userFoods = await loadUserFoodsForResolve(userId);
      const resolveFoods =
        selectedFoodHints.length > 0
          ? [...selectedFoodHints, ...userFoods]
          : userFoods;

      let parsed: Awaited<ReturnType<typeof parseMealDescription>>;
      if (process.env.OPENAI_API_KEY?.trim()) {
        try {
          parsed = await parseMealDescription(rawInput);
        } catch (e) {
          console.warn(
            "[analyze] LLM parse failed, using fallback split:",
            e instanceof Error ? e.message : e,
          );
          parsed = fallbackParseIngredients(rawInput);
        }
      } else {
        parsed = fallbackParseIngredients(rawInput);
      }

      parsed = {
        ...parsed,
        ingredients: applyGramsFromRawInput(parsed.ingredients, rawInput),
      };

      const lines: ResolvedLine[] = [];
      for (const ing of parsed.ingredients) {
        const matched = findMatchingUserFood(ing, resolveFoods);
        if (matched) {
          lines.push(lineFromUserFood(ing, matched));
          continue;
        }
        lines.push(await resolveIngredientLine(ing));
      }

      const meal_label =
        "meal_label" in parsed ? parsed.meal_label : undefined;
      const assumptions =
        "assumptions" in parsed ? parsed.assumptions : undefined;
      const totals = sumTotals(lines);

      if (!persist) {
        return NextResponse.json({
          mealId: null,
          meal_label,
          assumptions,
          lines,
          totals,
        });
      }

      const meal = await prisma.meal.create({
        data: {
          userId,
          rawInput,
          totalKcal: totals.kcal,
          totalProteinG: totals.protein_g,
          totalCarbsG: totals.carbs_g,
          totalFatG: totals.fat_g,
          totalFiberG: totals.fiber_g,
          totalSodiumMg: totals.sodium_mg,
          totalSugarG: totals.sugar_g,
          totalAddedSugarG: totals.added_sugar_g,
          lineItems: {
            create: prismaLineCreates(lines, meal_label, assumptions ?? null),
          },
        },
        select: { id: true },
      });

      return NextResponse.json({
        mealId: meal.id,
        meal_label,
        assumptions,
        lines,
        totals,
      });
    } catch (e) {
      if (isDbUnavailableError(e)) {
        return jsonError(
          "Database temporarily unavailable",
          503,
          "DATABASE_UNAVAILABLE",
        );
      }
      console.error("[analyze] failed:", e);
      const message = e instanceof Error ? e.message : "Analysis failed";
      return jsonError(message, 500, "ANALYSIS_FAILED");
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unexpected server error";
    console.error("[api/meals/analyze]", e);
    return jsonError(message, 500, "UNHANDLED");
  }
}

import { z } from "zod";
import { chatJsonCompletion } from "@/lib/llm/json-completion";
import {
  createOpenAICompatibleClient,
  getLlmSamplingParams,
  getMealLlmModel,
} from "@/lib/llm/openai-compatible-client";

const MealParseSchema = z.object({
  meal_label: z
    .string()
    .optional()
    .describe("Breakfast, lunch, dinner, or snack if inferable"),
  ingredients: z.array(
    z.object({
      name: z.string().describe("Ingredient name"),
      quantity_g: z
        .number()
        .positive()
        .describe("Amount in grams (convert volumes and counts to grams)"),
      search_query: z
        .string()
        .optional()
        .describe("Short food phrase for database matching if different from name"),
      unit_note: z
        .string()
        .optional()
        .describe("Original unit from user, e.g. 2 large eggs"),
    }),
  ),
  assumptions: z.array(z.string()).optional(),
});

export type ParsedMeal = z.infer<typeof MealParseSchema>;

export async function parseMealDescription(rawInput: string): Promise<ParsedMeal> {
  const openai = createOpenAICompatibleClient();
  const model = getMealLlmModel();
  const sampling = getLlmSamplingParams();

  const parsed = await chatJsonCompletion({
    openai,
    model,
    sampling,
    schema: MealParseSchema,
    messages: [
      {
        role: "system",
        content: `You are a nutrition data assistant. Parse the user's meal into distinct ingredients with amounts in grams.
Respond with a single JSON object only (no markdown), matching this shape:
{ "meal_label"?: string, "ingredients": [{ "name": string, "quantity_g": number, "search_query"?: string, "unit_note"?: string }], "assumptions"?: string[] }

Rules:
- Convert counts to grams using typical sizes (e.g., large egg ~50g each; slice bread ~35–45g unless specified).
- Convert volumes: 1 cup milk ~244g, 1 tbsp oil ~14g, 1 tsp ~5g for dense liquids; use reasonable food-specific estimates.
- Each ingredient must have quantity_g > 0.
- Prefer generic food names suitable for nutrition database matching in search_query when the name is ambiguous.`,
      },
      { role: "user", content: rawInput.trim().slice(0, 8000) },
    ],
  });

  if (!parsed.ingredients?.length) {
    throw new Error("Could not parse any ingredients from the meal");
  }
  return parsed;
}

const EstimateSchema = z.object({
  estimated_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fiber_g: z.number().nonnegative().optional(),
  sodium_mg: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  confidence: z.enum(["low", "medium", "high"]),
  reasoning: z.string(),
});

export type EstimateResult = z.infer<typeof EstimateSchema>;

export async function estimateIngredientNutrition(input: {
  name: string;
  quantity_g: number;
  unit_note?: string;
}): Promise<EstimateResult> {
  const openai = createOpenAICompatibleClient();
  const model = getMealLlmModel();
  const sampling = getLlmSamplingParams();

  return chatJsonCompletion({
    openai,
    model,
    sampling,
    schema: EstimateSchema,
    messages: [
      {
        role: "system",
        content: `You are a conservative nutrition estimator when database lookups fail.
Respond with a single JSON object only (no markdown), shape:
{ 
  "estimated_kcal": number, 
  "protein_g"?: number, 
  "carbs_g"?: number, 
  "fat_g"?: number, 
  "fiber_g"?: number, 
  "sodium_mg"?: number, 
  "sugar_g"?: number, 
  "confidence": "low"|"medium"|"high", 
  "reasoning": string 
}
Provide plausible calories and "Lite" micros (fiber, sodium, sugar) for the stated gram amount. Mark confidence low when uncertain.`,
      },
      {
        role: "user",
        content: `Ingredient: ${input.name}\nAmount: ${input.quantity_g} g${input.unit_note ? `\nContext: ${input.unit_note}` : ""}`,
      },
    ],
  });
}

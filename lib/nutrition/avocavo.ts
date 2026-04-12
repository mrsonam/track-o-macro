/**
 * Avocavo Nutrition API (USDA FoodData Central-backed)
 * @see https://nutrition.avocavo.app/docs/rest
 */

const AVOCAVO_BASE = "https://app.avocavo.app/api/v2/nutrition";

export function requireAvocavoApiKey(): string {
  const k = process.env.AVOCAVO_API_KEY?.trim();
  if (!k) {
    throw new Error("AVOCAVO_API_KEY is not configured");
  }
  return k;
}

/** Max ingredients per /batch request (Free=3, Starter=10, Pro=25). */
export function maxBatchSize(): number {
  const raw = process.env.AVOCAVO_MAX_BATCH?.trim();
  if (raw) {
    const n = Number.parseInt(raw, 10);
    if (Number.isFinite(n) && n > 0) return Math.min(n, 50);
  }
  return 3;
}

export type AvocavoBatchItem = {
  success: boolean;
  ingredient?: string;
  nutrition?: {
    calories?: number;
    protein?: number;
    total_fat?: number;
    carbohydrates?: number;
  };
  metadata?: {
    usda_match?: { fdc_id?: number; description?: string };
    usda_link?: string;
    match_quality?: string;
    confidence?: number;
  };
  error?: string;
};

export type AvocavoBatchResponse = {
  success?: boolean;
  results?: AvocavoBatchItem[];
  error?: string;
  message?: string;
};

export async function batchAnalyzeIngredients(
  phrases: string[],
): Promise<AvocavoBatchResponse> {
  const key = requireAvocavoApiKey();
  const res = await fetch(`${AVOCAVO_BASE}/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify({
      ingredients: phrases.map((ingredient) => ({ ingredient })),
    }),
  });

  const text = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(text) as AvocavoBatchResponse;
  } catch {
    throw new Error(
      `Avocavo batch failed: ${res.status} ${text.slice(0, 200)}`,
    );
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : text.slice(0, 200);
    throw new Error(`Avocavo batch failed: ${res.status} ${msg}`);
  }

  return data as AvocavoBatchResponse;
}

export type AvocavoParsing = {
  estimated_grams?: number;
  ingredient_name?: string;
};

export type AvocavoAnalyzeResultItem = AvocavoBatchItem & {
  parsing?: AvocavoParsing;
};

export type AvocavoAnalyzeResponse = {
  success?: boolean;
  source_text?: string;
  extracted_ingredients?: string[];
  results?: AvocavoAnalyzeResultItem[];
  summary?: { successful?: number; failed?: number };
  error?: string;
  message?: string;
};

/**
 * Free-form meal text → split ingredients + nutrition per line (Avocavo; max 2000 chars).
 * @see https://nutrition.avocavo.app/docs/rest
 */
export async function analyzeFreeTextMeal(
  text: string,
): Promise<AvocavoAnalyzeResponse> {
  const key = requireAvocavoApiKey();
  const trimmed = text.trim().slice(0, 2000);
  if (!trimmed) {
    throw new Error("Meal text is empty");
  }

  const res = await fetch(`${AVOCAVO_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify({ text: trimmed }),
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as AvocavoAnalyzeResponse;
  } catch {
    throw new Error(`Avocavo analyze failed: ${res.status} ${raw.slice(0, 200)}`);
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : raw.slice(0, 200);
    throw new Error(`Avocavo analyze failed: ${res.status} ${msg}`);
  }

  return data as AvocavoAnalyzeResponse;
}

/** Single natural-language ingredient line (used as fallback when batch fails). */
export async function singleIngredientAnalyze(
  ingredient: string,
): Promise<AvocavoAnalyzeResultItem> {
  const key = requireAvocavoApiKey();
  const res = await fetch(`${AVOCAVO_BASE}/ingredient`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
    },
    body: JSON.stringify({ ingredient: ingredient.trim() }),
  });

  const raw = await res.text();
  let data: unknown;
  try {
    data = JSON.parse(raw) as AvocavoAnalyzeResultItem & {
      error?: string;
      message?: string;
    };
  } catch {
    throw new Error(
      `Avocavo ingredient failed: ${res.status} ${raw.slice(0, 200)}`,
    );
  }

  if (!res.ok) {
    const msg =
      typeof data === "object" && data && "message" in data
        ? String((data as { message?: string }).message)
        : raw.slice(0, 200);
    throw new Error(`Avocavo ingredient failed: ${res.status} ${msg}`);
  }

  return data as AvocavoAnalyzeResultItem;
}

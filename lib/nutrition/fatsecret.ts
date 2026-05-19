import { fatSecretFetch, isFatSecretProxyConfigured } from "@/lib/nutrition/fatsecret-http";

const FATSECRET_TOKEN_URL = "https://oauth.fatsecret.com/connect/token";
const FATSECRET_API_URL = "https://platform.fatsecret.com/rest/server.api";

type FatSecretTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

type FatSecretServing = {
  serving_id?: string;
  serving_description?: string;
  metric_serving_amount?: string | number;
  metric_serving_unit?: string;
  number_of_units?: string | number;
  calories?: string | number;
  carbohydrate?: string | number;
  protein?: string | number;
  fat?: string | number;
};

type FatSecretFood = {
  food_id?: string | number;
  food_name?: string;
  brand_name?: string;
  food_type?: string;
  food_description?: string;
  servings?: {
    serving?: FatSecretServing | FatSecretServing[];
  };
};

type FatSecretSearchResponse = {
  foods?: {
    food?: FatSecretFood | FatSecretFood[];
  };
};
type FatSecretFoodGetResponse = {
  food?: FatSecretFood;
};
type FatSecretFindIdResponse = {
  food_id?: string | number;
};

type FatSecretTokenCache = {
  token: string;
  expiresAtMs: number;
};

let tokenCache: FatSecretTokenCache | null = null;

function readFatSecretCredentials(): { clientId: string; clientSecret: string } {
  const clientId =
    process.env.FATSECRET_CLIENT_ID?.trim() ?? process.env.CLIENT_ID?.trim() ?? "";
  const clientSecret =
    process.env.FATSECRET_CLIENT_SECRET?.trim() ??
    process.env.CLIENT_SECRET?.trim() ??
    "";
  if (!clientId || !clientSecret) {
    throw new Error("FatSecret credentials are not configured");
  }
  return { clientId, clientSecret };
}

export { isFatSecretProxyConfigured };

/** True when FatSecret OAuth credentials are present (may still fail at runtime, e.g. IP allowlist). */
export function hasFatSecretCredentials(): boolean {
  const clientId =
    process.env.FATSECRET_CLIENT_ID?.trim() ?? process.env.CLIENT_ID?.trim() ?? "";
  const clientSecret =
    process.env.FATSECRET_CLIENT_SECRET?.trim() ??
    process.env.CLIENT_SECRET?.trim() ??
    "";
  return Boolean(clientId && clientSecret);
}

function toNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function listify<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

async function getFatSecretAccessToken(): Promise<string> {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.token;
  }

  const { clientId, clientSecret } = readFatSecretCredentials();
  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "basic",
  });

  const res = await fatSecretFetch(FATSECRET_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const raw = await res.text();
  let data: FatSecretTokenResponse = {};
  try {
    data = JSON.parse(raw) as FatSecretTokenResponse;
  } catch {
    throw new Error(`FatSecret token parse failed: ${raw.slice(0, 200)}`);
  }

  if (!res.ok || !data.access_token) {
    const hint = isFatSecretProxyConfigured()
      ? ""
      : " If FatSecret IP restrictions are enabled, set FATSECRET_HTTP_PROXY to a static-IP egress proxy and whitelist that IP.";
    throw new Error(
      `FatSecret token failed: ${res.status} ${raw.slice(0, 200)}.${hint}`,
    );
  }

  const expiresInSec = Math.max(60, Number(data.expires_in) || 3600);
  tokenCache = {
    token: data.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return tokenCache.token;
}

async function callFatSecretApi(
  params: Record<string, string>,
): Promise<string> {
  const token = await getFatSecretAccessToken();
  const body = new URLSearchParams({
    ...params,
    format: "json",
  });
  const res = await fatSecretFetch(FATSECRET_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`FatSecret API failed: ${res.status} ${raw.slice(0, 200)}`);
  }
  try {
    const payload = JSON.parse(raw) as { error?: { code?: number; message?: string } };
    if (payload.error?.message) {
      throw new Error(
        `FatSecret API error ${payload.error.code ?? ""}: ${payload.error.message}`.trim(),
      );
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith("FatSecret API error")) {
      throw e;
    }
    // Non-JSON body is returned as-is for callers to handle.
  }
  return raw;
}

export type FatSecretServingOption = {
  id: string;
  label: string;
  grams: number;
};

export type FatSecretSuggestionItem = {
  label: string;
  fdcId: number;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  servings?: FatSecretServingOption[];
};

/** Grams represented by one unit in FatSecret search blurbs (heuristic for "Per 1 egg" etc.). */
function gramsForServingUnit(amount: number, unitRaw: string): number | null {
  const u = unitRaw.toLowerCase();
  if (u === "g" || u === "gram" || u === "grams") return amount;
  if (u === "ml" || u === "milliliter" || u === "milliliters") return amount;
  if (u === "oz" || u === "ounce" || u === "ounces") return amount * 28.3495;
  if (u === "lb" || u === "lbs" || u === "pound" || u === "pounds")
    return amount * 453.592;
  if (u === "egg" || u === "eggs") return amount * 50;
  if (u === "cup" || u === "cups") return amount * 240;
  if (u === "tbsp" || u === "tablespoon" || u === "tablespoons") return amount * 15;
  if (u === "tsp" || u === "teaspoon" || u === "teaspoons") return amount * 5;
  return null;
}

/**
 * Search JSON often omits `servings` and only returns a line like:
 * "Per 100g - Calories: 147kcal | Fat: 9.94g | Carbs: 0.77g | Protein: 12.58g"
 */
function parseFoodDescriptionToPer100g(desc: string | undefined): {
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
} | null {
  if (!desc?.trim()) return null;

  const macroRe =
    /Calories:\s*(\d+(?:\.\d+)?)\s*kcal\s*\|\s*Fat:\s*(\d+(?:\.\d+)?)g\s*\|\s*Carbs:\s*(\d+(?:\.\d+)?)g\s*\|\s*Protein:\s*(\d+(?:\.\d+)?)g/i;
  const macroMatch = desc.match(macroRe);
  if (!macroMatch) return null;

  const kcal = Number(macroMatch[1]);
  const fat = Number(macroMatch[2]);
  const carbs = Number(macroMatch[3]);
  const protein = Number(macroMatch[4]);
  if (![kcal, fat, carbs, protein].every((n) => Number.isFinite(n))) return null;

  const prefixRe =
    /^Per\s+([\d.]+)\s*(g|oz|ml|egg|eggs|cup|cups|tbsp|tsp|lb|lbs)\b/i;
  const prefixMatch = desc.trim().match(prefixRe);
  if (!prefixMatch) return null;

  const perAmount = Number(prefixMatch[1]);
  const unit = prefixMatch[2] ?? "g";
  if (!Number.isFinite(perAmount) || perAmount <= 0) return null;

  const servingG = gramsForServingUnit(perAmount, unit);
  if (servingG == null || servingG <= 0) return null;

  const factor = 100 / servingG;
  return {
    kcalPer100g: kcal * factor,
    proteinPer100g: protein * factor,
    carbsPer100g: carbs * factor,
    fatPer100g: fat * factor,
  };
}

function suggestionLabel(food: FatSecretFood): string | null {
  const name = (food.food_name ?? "").trim();
  if (!name) return null;
  const brand = (food.brand_name ?? "").trim();
  return brand ? `${name} (${brand})` : name;
}

function mapServingsFromFood(food: FatSecretFood): FatSecretServingOption[] {
  const servings = listify(food.servings?.serving);
  const out: FatSecretServingOption[] = [];
  for (const s of servings) {
    const desc = (s.serving_description ?? "").trim();
    const metricAmount = toNumber(s.metric_serving_amount);
    const metricUnit = String(s.metric_serving_unit ?? "").toLowerCase();
    if (!desc) continue;
    let grams: number | null = null;
    if (metricAmount != null && metricAmount > 0) {
      if (metricUnit === "g" || metricUnit === "gram" || metricUnit === "grams") {
        grams = metricAmount;
      } else {
        grams = gramsForServingUnit(metricAmount, metricUnit);
      }
    }
    if (grams == null || grams <= 0) continue;
    const id = String(s.serving_id ?? desc);
    if (out.some((o) => o.id === id)) continue;
    out.push({ id, label: desc, grams: Math.round(grams * 10) / 10 });
  }
  return out.slice(0, 12);
}

function mapFoodToSuggestion(food: FatSecretFood, index: number): FatSecretSuggestionItem | null {
  const label = suggestionLabel(food);
  if (!label) return null;

  const servings = listify(food.servings?.serving);
  const servingOptions = mapServingsFromFood(food);

  let kcalPer100g: number | null = null;
  let proteinPer100g: number | null = null;
  let carbsPer100g: number | null = null;
  let fatPer100g: number | null = null;

  if (servings.length > 0) {
    const preferred =
      servings.find(
        (s) =>
          String(s.metric_serving_unit ?? "").toLowerCase() === "g" &&
          (toNumber(s.metric_serving_amount) ?? 0) > 0,
      ) ?? servings[0]!;

    const metricAmount = toNumber(preferred.metric_serving_amount);
    const calories = toNumber(preferred.calories);
    const protein = toNumber(preferred.protein);
    const carbs = toNumber(preferred.carbohydrate);
    const fat = toNumber(preferred.fat);

    const toPer100g = (v: number | null): number | null => {
      if (v == null) return null;
      if (metricAmount != null && metricAmount > 0) {
        return (v * 100) / metricAmount;
      }
      return null;
    };

    kcalPer100g = toPer100g(calories);
    proteinPer100g = toPer100g(protein);
    carbsPer100g = toPer100g(carbs);
    fatPer100g = toPer100g(fat);
  }

  if (
    kcalPer100g == null ||
    proteinPer100g == null ||
    carbsPer100g == null ||
    fatPer100g == null
  ) {
    const parsed = parseFoodDescriptionToPer100g(food.food_description);
    if (!parsed) return null;
    kcalPer100g = parsed.kcalPer100g;
    proteinPer100g = parsed.proteinPer100g;
    carbsPer100g = parsed.carbsPer100g;
    fatPer100g = parsed.fatPer100g;
  }

  const id = Number(food.food_id);
  const fdcId = Number.isFinite(id) && id > 0 ? id : -(index + 1);

  return {
    label,
    fdcId,
    kcalPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    ...(servingOptions.length > 0 ? { servings: servingOptions } : {}),
  };
}

export async function fatSecretSearchFoods(
  query: string,
  maxResults = 8,
): Promise<FatSecretSuggestionItem[]> {
  const raw = await callFatSecretApi({
    method: "foods.search",
    search_expression: query.trim(),
    max_results: String(Math.max(1, Math.min(50, maxResults))),
  });
  console.log("[fatsecret-search] raw response:", raw);
  let data: FatSecretSearchResponse = {};
  try {
    data = JSON.parse(raw) as FatSecretSearchResponse;
  } catch {
    throw new Error(`FatSecret search parse failed: ${raw.slice(0, 200)}`);
  }

  const foods = listify(data.foods?.food);
  const mapped = foods
    .map((food, index) => mapFoodToSuggestion(food, index))
    .filter((item): item is FatSecretSuggestionItem => item !== null);

  const seen = new Set<string>();
  return mapped.filter((item) => {
    const key = item.label.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function fatSecretLookupBarcode(
  barcode: string,
): Promise<FatSecretSuggestionItem | null> {
  const clean = barcode.trim();
  if (!clean) return null;

  try {
    const idRaw = await callFatSecretApi({
      method: "food.find_id_for_barcode",
      barcode: clean,
    });
    console.log("[fatsecret-barcode] find_id raw response:", idRaw);
    let idData: FatSecretFindIdResponse = {};
    try {
      idData = JSON.parse(idRaw) as FatSecretFindIdResponse;
    } catch {
      idData = {};
    }
    const foodId = idData.food_id != null ? String(idData.food_id) : "";
    if (foodId) {
      const foodRaw = await callFatSecretApi({
        method: "food.get",
        food_id: foodId,
      });
      console.log("[fatsecret-barcode] food.get raw response:", foodRaw);
      let foodData: FatSecretFoodGetResponse = {};
      try {
        foodData = JSON.parse(foodRaw) as FatSecretFoodGetResponse;
      } catch {
        foodData = {};
      }
      if (foodData.food) {
        return mapFoodToSuggestion(foodData.food, 0);
      }
    }
  } catch {
    // Fallback to text search below.
  }

  const fallback = await fatSecretSearchFoods(clean, 5);
  return fallback[0] ?? null;
}

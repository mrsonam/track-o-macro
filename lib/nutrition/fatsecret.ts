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

  const res = await fetch(FATSECRET_TOKEN_URL, {
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
    throw new Error(
      `FatSecret token failed: ${res.status} ${raw.slice(0, 200)}`,
    );
  }

  const expiresInSec = Math.max(60, Number(data.expires_in) || 3600);
  tokenCache = {
    token: data.access_token,
    expiresAtMs: now + expiresInSec * 1000,
  };
  return tokenCache.token;
}

export type FatSecretSuggestionItem = {
  label: string;
  fdcId: number;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
};

function mapFoodToSuggestion(food: FatSecretFood, index: number): FatSecretSuggestionItem | null {
  const label = (food.food_name ?? "").trim();
  if (!label) return null;

  const servings = listify(food.servings?.serving);
  if (servings.length === 0) return null;

  // Prefer gram-based servings for accurate per-100g conversion.
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

  const id = Number(food.food_id);
  const fdcId = Number.isFinite(id) && id > 0 ? id : -(index + 1);

  return {
    label,
    fdcId,
    kcalPer100g: toPer100g(calories),
    proteinPer100g: toPer100g(protein),
    carbsPer100g: toPer100g(carbs),
    fatPer100g: toPer100g(fat),
  };
}

export async function fatSecretSearchFoods(
  query: string,
  maxResults = 8,
): Promise<FatSecretSuggestionItem[]> {
  const token = await getFatSecretAccessToken();
  const params = new URLSearchParams({
    method: "foods.search",
    search_expression: query.trim(),
    max_results: String(Math.max(1, Math.min(50, maxResults))),
    format: "json",
  });

  const res = await fetch(FATSECRET_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const raw = await res.text();
  console.log("[fatsecret-search] raw response:", raw);
  let data: FatSecretSearchResponse = {};
  try {
    data = JSON.parse(raw) as FatSecretSearchResponse;
  } catch {
    throw new Error(`FatSecret search parse failed: ${raw.slice(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`FatSecret search failed: ${res.status} ${raw.slice(0, 200)}`);
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

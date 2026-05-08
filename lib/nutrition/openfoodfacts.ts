const OFF_BASE_URL = "https://world.openfoodfacts.org";

type OffProductResponse = {
  status?: number;
  code?: string;
  product?: {
    product_name?: string;
    product_name_en?: string;
    brands?: string;
    nutriments?: {
      "energy-kcal_100g"?: number | string;
      energy_kcal_100g?: number | string;
      proteins_100g?: number | string;
      carbohydrates_100g?: number | string;
      fat_100g?: number | string;
    };
  };
};

export type OffSuggestionItem = {
  label: string;
  fdcId: number;
  kcalPer100g: number | null;
  proteinPer100g: number | null;
  carbsPer100g: number | null;
  fatPer100g: number | null;
  fiberPer100g?: number | null;
  sodiumPer100g?: number | null;
  sugarPer100g?: number | null;
  addedSugarPer100g?: number | null;
};

function toNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cleanBarcode(input: string): string {
  return input.replace(/[^\d]/g, "").trim();
}

export async function openFoodFactsLookupBarcode(
  barcodeInput: string,
): Promise<OffSuggestionItem | null> {
  const barcode = cleanBarcode(barcodeInput);
  if (!barcode) return null;

  const fields = [
    "code",
    "product_name",
    "product_name_en",
    "brands",
    "nutriments",
  ].join(",");
  const url = `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(
    barcode,
  )}?fields=${encodeURIComponent(fields)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  const raw = await res.text();
  console.log("[openfoodfacts-barcode] raw response:", raw);

  if (!res.ok) {
    throw new Error(`OpenFoodFacts lookup failed: ${res.status} ${raw.slice(0, 200)}`);
  }

  let data: OffProductResponse = {};
  try {
    data = JSON.parse(raw) as OffProductResponse;
  } catch {
    throw new Error(`OpenFoodFacts parse failed: ${raw.slice(0, 200)}`);
  }

  if (!data.product || data.status === 0) return null;

  const n = data.product.nutriments ?? {};
  const labelBase =
    data.product.product_name?.trim() ||
    data.product.product_name_en?.trim() ||
    `Barcode ${barcode}`;
  const brand = data.product.brands?.trim();
  const label = brand ? `${labelBase} (${brand})` : labelBase;

  const kcalPer100g =
    toNum(n["energy-kcal_100g"]) ?? toNum(n.energy_kcal_100g);
  const proteinPer100g = toNum(n.proteins_100g);
  const carbsPer100g = toNum(n.carbohydrates_100g);
  const fatPer100g = toNum(n.fat_100g);
  const fiberPer100g = toNum((n as Record<string, unknown>).fiber_100g);
  const sodiumRaw = toNum((n as Record<string, unknown>).sodium_100g);
  const sugarPer100g = toNum((n as Record<string, unknown>).sugars_100g);
  const addedSugarPer100g = toNum(
    (n as Record<string, unknown>)["added-sugars_100g"],
  );
  // OFF sodium is usually in g/100g; convert to mg/100g for app consistency.
  const sodiumPer100g =
    sodiumRaw != null ? Math.round(sodiumRaw * 1000) : null;

  const id = Number(data.code ?? barcode);
  const fdcId = Number.isFinite(id) && id > 0 ? id : -Math.max(1, barcode.length);

  return {
    label,
    fdcId,
    kcalPer100g,
    proteinPer100g,
    carbsPer100g,
    fatPer100g,
    fiberPer100g,
    sodiumPer100g,
    sugarPer100g,
    addedSugarPer100g,
  };
}

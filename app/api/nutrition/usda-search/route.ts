import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { batchAnalyzeIngredients } from "@/lib/nutrition/avocavo";
import { fatSecretSearchFoods, hasFatSecretCredentials } from "@/lib/nutrition/fatsecret";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  console.log("[avocavo-search] q:", q);
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  if (hasFatSecretCredentials()) {
    console.log("[fatsecret-search] searching with FatSecret");
    try {
      const items = await fatSecretSearchFoods(q, 8);
      console.log("[fatsecret-search] items:", items);
      return NextResponse.json({ items });
    } catch (error) {
      console.error("[fatsecret-search] failed, falling back to Avocavo:", error);
    }
  }

  const apiKey = process.env.AVOCAVO_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ items: [] });

  try {
    const payload = await batchAnalyzeIngredients([q]);
    const seen = new Set<string>();
    const items = (payload.results ?? [])
      .map((item, index) => {
        if (!item.success || !item.nutrition) return null;
        const label = item.ingredient?.trim() ?? "";
        if (!label) return null;
        const key = label.toLowerCase();
        if (seen.has(key)) return null;
        seen.add(key);
        const n = item.nutrition;
        const fdcId =
          Number(item.metadata?.usda_match?.fdc_id) ||
          Math.max(1, index + 1) * -1;
        return {
          label,
          fdcId,
          kcalPer100g: Number.isFinite(Number(n.calories))
            ? Number(n.calories)
            : null,
          proteinPer100g: Number.isFinite(Number(n.protein))
            ? Number(n.protein)
            : null,
          carbsPer100g: Number.isFinite(Number(n.carbohydrates))
            ? Number(n.carbohydrates)
            : null,
          fatPer100g: Number.isFinite(Number(n.total_fat))
            ? Number(n.total_fat)
            : null,
        };
      })
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[avocavo-search] failed:", error);
    return NextResponse.json({ items: [] });
  }
}

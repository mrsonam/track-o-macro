import { normalizeFoodLabel, type ResolvedLine } from "@/lib/nutrition/resolve-ingredient";
import { prisma } from "@/lib/prisma";

function toPer100g(value: number, grams: number): number {
  return Math.round((value / grams) * 1000) / 10;
}

export async function cacheResolvedUsdaLinesAsUserFoods(
  userId: string,
  lines: ResolvedLine[],
): Promise<void> {
  const candidates = lines
    .filter((line) => line.source === "fdc" && line.unit === "g" && line.quantity > 0)
    .map((line) => {
      const label = line.label.trim();
      if (!label) return null;

      const grams = Number(line.quantity);
      const kcal = toPer100g(Number(line.kcal), grams);
      const protein = toPer100g(Number(line.protein_g), grams);
      const carbs = toPer100g(Number(line.carbs_g), grams);
      const fat = toPer100g(Number(line.fat_g), grams);

      if (![kcal, protein, carbs, fat].every(Number.isFinite)) return null;

      return {
        userId,
        label,
        labelNorm: normalizeFoodLabel(label),
        kcalPer100g: kcal,
        proteinPer100g: protein,
        carbsPer100g: carbs,
        fatPer100g: fat,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  if (candidates.length === 0) return;

  await prisma.userFood.createMany({
    data: candidates,
    skipDuplicates: true,
  });
}

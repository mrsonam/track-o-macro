import { prisma } from "@/lib/prisma";
import type { UserFoodResolveInput } from "@/lib/nutrition/resolve-ingredient";

export function userFoodRowToResolveInput(row: {
  id: string;
  label: string;
  kcalPer100g: { toString(): string };
  proteinPer100g: { toString(): string };
  carbsPer100g: { toString(): string };
  fatPer100g: { toString(): string };
  version: number;
}): UserFoodResolveInput {
  return {
    id: row.id,
    label: row.label,
    kcalPer100g: Number(row.kcalPer100g),
    proteinPer100g: Number(row.proteinPer100g),
    carbsPer100g: Number(row.carbsPer100g),
    fatPer100g: Number(row.fatPer100g),
    version: row.version,
  };
}

export async function loadUserFoodsForResolve(
  userId: string,
): Promise<UserFoodResolveInput[]> {
  const rows = await prisma.userFood.findMany({
    where: { userId },
    select: {
      id: true,
      label: true,
      kcalPer100g: true,
      proteinPer100g: true,
      carbsPer100g: true,
      fatPer100g: true,
      version: true,
    },
  });
  return rows.map(userFoodRowToResolveInput);
}

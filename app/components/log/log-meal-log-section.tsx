import { redirect } from "next/navigation";
import { MealLogClient } from "@/app/components/meal-log-client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { formatLocalYmd } from "@/lib/meals/local-date";
import { type UnitSystem } from "@/lib/profile/units";

function parseLogDateKey(raw: string | undefined): string {
  const today = formatLocalYmd(new Date());
  if (!raw?.trim()) return today;
  const v = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  return today;
}

type LogMealLogSectionProps = {
  logDateKey?: string;
};

export async function LogMealLogSection({ logDateKey }: LogMealLogSectionProps) {
  const session = await getSession();
  const userId = session?.user?.id;
  if (userId == null) {
    redirect("/login");
  }

  let savedMeals: { id: string; title: string; rawInput: string }[] = [];
  let preparedMeals: {
    id: string;
    title: string;
    preparedGrams: number;
    batchTotalKcal: number;
    batchTotalProteinG: number;
    batchTotalCarbsG: number;
    batchTotalFatG: number;
    batchTotalFiberG: number | null;
    batchTotalSodiumMg: number | null;
    batchTotalSugarG: number | null;
    batchTotalAddedSugarG: number | null;
    createdAt: string;
  }[] = [];
  let unitSystem: UnitSystem = "metric";

  try {
    const [saved, prepared, profile] = await Promise.all([
      prisma.savedMeal.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, rawInput: true },
      }),
      prisma.preparedMeal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          title: true,
          preparedGrams: true,
          batchTotalKcal: true,
          batchTotalProteinG: true,
          batchTotalCarbsG: true,
          batchTotalFatG: true,
          batchTotalFiberG: true,
          batchTotalSodiumMg: true,
          batchTotalSugarG: true,
          batchTotalAddedSugarG: true,
          createdAt: true,
        },
      }),
      prisma.userProfile.findUnique({
        where: { userId },
        select: { unitSystem: true },
      }),
    ]);
    savedMeals = saved;
    preparedMeals = prepared.map((m) => ({
      id: m.id,
      title: m.title,
      preparedGrams: Number(m.preparedGrams),
      batchTotalKcal: Number(m.batchTotalKcal),
      batchTotalProteinG: Number(m.batchTotalProteinG),
      batchTotalCarbsG: Number(m.batchTotalCarbsG),
      batchTotalFatG: Number(m.batchTotalFatG),
      batchTotalFiberG:
        m.batchTotalFiberG != null ? Number(m.batchTotalFiberG) : null,
      batchTotalSodiumMg:
        m.batchTotalSodiumMg != null ? Number(m.batchTotalSodiumMg) : null,
      batchTotalSugarG:
        m.batchTotalSugarG != null ? Number(m.batchTotalSugarG) : null,
      batchTotalAddedSugarG:
        m.batchTotalAddedSugarG != null
          ? Number(m.batchTotalAddedSugarG)
          : null,
      createdAt: m.createdAt.toISOString(),
    }));
    unitSystem =
      profile?.unitSystem === "imperial" ? "imperial" : "metric";
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  return (
    <MealLogClient
      variant="log"
      logDateKey={parseLogDateKey(logDateKey)}
      unitSystem={unitSystem}
      savedMeals={savedMeals}
      preparedMeals={preparedMeals}
    />
  );
}

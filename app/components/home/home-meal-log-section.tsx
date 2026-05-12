import { redirect } from "next/navigation";
import { MealLogClient } from "@/app/components/meal-log-client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { DEFAULT_HYDRATION_GOAL_ML } from "@/lib/hydration/defaults";
import { type UnitSystem } from "@/lib/profile/units";
import { loadHomeWeekPrefetch } from "@/lib/meals/load-home-week-prefetch";

/** Home dashboard data — streamed inside Suspense so the route shell can paint first. */
export async function HomeMealLogSection() {
  const session = await getSession();
  const userId = session?.user?.id;

  if (userId == null) {
    redirect("/login");
  }

  let profile: {
    targetKcal: unknown;
    targetProteinG: unknown;
    loggingStyle: string | null;
    weeklyCoachingFocus: string | null;
    weeklyImplementationIntention: string | null;
    unitSystem: string | null;
    activeDays14Enabled?: boolean;
    weightTrendOnHomeEnabled?: boolean;
    targetHydrationMl: number | null;
  } | null = null;
  let recentMeals: {
    id: string;
    rawInput: string;
    totalKcal: { toString(): string };
    createdAt: Date;
  }[] = [];
  let savedMeals: { id: string; title: string; rawInput: string }[] = [];
  let preparedMeals: {
    id: string;
    title: string;
    preparedGrams: { toString(): string };
    batchTotalKcal: { toString(): string };
    batchTotalProteinG: { toString(): string };
    batchTotalCarbsG: { toString(): string };
    batchTotalFatG: { toString(): string };
    batchTotalFiberG: { toString(): string } | null;
    batchTotalSodiumMg: { toString(): string } | null;
    batchTotalSugarG: { toString(): string } | null;
    batchTotalAddedSugarG: { toString(): string } | null;
    createdAt: Date;
  }[] = [];

  try {
    const [p, recent, saved, prepared] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId },
        select: {
          targetKcal: true,
          targetProteinG: true,
          loggingStyle: true,
          weeklyCoachingFocus: true,
          weeklyImplementationIntention: true,
          unitSystem: true,
          activeDays14Enabled: true,
          weightTrendOnHomeEnabled: true,
          targetHydrationMl: true,
        },
      }),
      prisma.meal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rawInput: true,
          totalKcal: true,
          createdAt: true,
        },
      }),
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
    ]);
    profile = p;
    recentMeals = recent;
    savedMeals = saved;
    preparedMeals = prepared;
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  const dailyTargetKcal =
    profile?.targetKcal != null ? Number(profile.targetKcal) : null;
  const dailyTargetProteinG =
    profile?.targetProteinG != null ? Number(profile.targetProteinG) : null;
  const loggingStyle =
    profile?.loggingStyle === "quick_estimates" ||
    profile?.loggingStyle === "weigh_often" ||
    profile?.loggingStyle === "mixed"
      ? profile.loggingStyle
      : null;

  const weeklyCoachingFocus = parseWeeklyCoachingFocus(
    profile?.weeklyCoachingFocus,
  );

  const unitSystem: UnitSystem =
    profile?.unitSystem === "imperial" ? "imperial" : "metric";

  const dailyTargetHydrationMl =
    profile?.targetHydrationMl != null
      ? Number(profile.targetHydrationMl)
      : DEFAULT_HYDRATION_GOAL_ML;

  let homeWeekPrefetch = null;
  try {
    homeWeekPrefetch = await loadHomeWeekPrefetch(
      userId,
      profile?.activeDays14Enabled ?? false,
    );
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  return (
    <MealLogClient
      dailyTargetKcal={dailyTargetKcal}
      dailyTargetProteinG={dailyTargetProteinG}
      dailyTargetHydrationMl={dailyTargetHydrationMl}
      loggingStyle={loggingStyle}
      weeklyCoachingFocus={weeklyCoachingFocus}
      weeklyImplementationIntention={profile?.weeklyImplementationIntention ?? null}
      activeDays14Enabled={profile?.activeDays14Enabled ?? false}
      weightTrendOnHomeEnabled={profile?.weightTrendOnHomeEnabled ?? false}
      unitSystem={unitSystem}
      savedMeals={savedMeals}
      preparedMeals={preparedMeals.map((m) => ({
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
      }))}
      recentMeals={recentMeals.map((m) => ({
        id: m.id,
        rawInput: m.rawInput,
        totalKcal: Number(m.totalKcal),
        createdAt: m.createdAt.toISOString(),
      }))}
      initialWeekPrefetch={homeWeekPrefetch}
    />
  );
}

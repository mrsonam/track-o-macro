import { redirect } from "next/navigation";
import { MealLogClient } from "@/app/components/meal-log-client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { DEFAULT_HYDRATION_GOAL_ML } from "@/lib/hydration/defaults";
import { type UnitSystem } from "@/lib/profile/units";

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

  try {
    const [p, recent, saved] = await Promise.all([
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
    ]);
    profile = p;
    recentMeals = recent;
    savedMeals = saved;
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
      recentMeals={recentMeals.map((m) => ({
        id: m.id,
        rawInput: m.rawInput,
        totalKcal: Number(m.totalKcal),
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}

import { redirect } from "next/navigation";
import { MealLogClient } from "../components/meal-log-client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";

export default async function HomePage() {
  const session = await getSession();
  const userId = session?.user?.id;

  let profile: {
    targetKcal: unknown;
    targetProteinG: unknown;
    loggingStyle: string | null;
    weeklyCoachingFocus: string | null;
  } | null = null;
  let recentMeals: {
    id: string;
    rawInput: string;
    totalKcal: { toString(): string };
    createdAt: Date;
  }[] = [];
  let savedMeals: { id: string; title: string; rawInput: string }[] = [];

  if (userId != null) {
    try {
      profile = await prisma.userProfile.findUnique({
        where: { userId },
        select: {
          targetKcal: true,
          targetProteinG: true,
          loggingStyle: true,
          weeklyCoachingFocus: true,
        },
      });
      recentMeals = await prisma.meal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          rawInput: true,
          totalKcal: true,
          createdAt: true,
        },
      });
      savedMeals = await prisma.savedMeal.findMany({
        where: { userId },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true, title: true, rawInput: true },
      });
    } catch (e) {
      if (isDbUnavailableError(e)) {
        redirect("/error/database");
      }
      throw e;
    }
  }

  const dailyTargetKcal =
    profile?.targetKcal != null ? Number(profile.targetKcal) : null;
  const dailyTargetProteinG =
    profile?.targetProteinG != null
      ? Number(profile.targetProteinG)
      : null;
  const loggingStyle =
    profile?.loggingStyle === "quick_estimates" ||
    profile?.loggingStyle === "weigh_often" ||
    profile?.loggingStyle === "mixed"
      ? profile.loggingStyle
      : null;

  const weeklyCoachingFocus = parseWeeklyCoachingFocus(
    profile?.weeklyCoachingFocus,
  );

  return (
    <MealLogClient
      dailyTargetKcal={dailyTargetKcal}
      dailyTargetProteinG={dailyTargetProteinG}
      loggingStyle={loggingStyle}
      weeklyCoachingFocus={weeklyCoachingFocus}
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

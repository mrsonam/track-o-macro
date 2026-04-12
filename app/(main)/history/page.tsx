import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDbUnavailableError } from "@/lib/db-errors";
import { HistoryMealList } from "@/app/components/history-meal-list";
import { HistoryFortnightStrip } from "@/app/components/history-fortnight-strip";
import { HistoryInsightsStrip } from "@/app/components/history-insights-strip";
import { HistoryMonthInsights } from "@/app/components/history-month-insights";
import { HISTORY_MEALS_PAGE_SIZE } from "@/lib/meals/history-meals-page";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";

export default async function HistoryPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/history");
  }

  let profile: {
    targetKcal: unknown;
    targetProteinG: unknown;
    weeklyCoachingFocus: string | null;
  } | null = null;
  let meals;
  let initialHasMore = false;
  try {
    profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        targetKcal: true,
        targetProteinG: true,
        weeklyCoachingFocus: true,
      },
    });
    const mealRows = await prisma.meal.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_MEALS_PAGE_SIZE + 1,
      select: {
        id: true,
        rawInput: true,
        totalKcal: true,
        createdAt: true,
      },
    });
    initialHasMore = mealRows.length > HISTORY_MEALS_PAGE_SIZE;
    meals = initialHasMore
      ? mealRows.slice(0, HISTORY_MEALS_PAGE_SIZE)
      : mealRows;
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  const dailyTargetKcal =
    profile?.targetKcal != null ? Number(profile.targetKcal) : null;
  const dailyTargetProteinG =
    profile?.targetProteinG != null
      ? Number(profile.targetProteinG)
      : null;

  const weeklyCoachingFocus = parseWeeklyCoachingFocus(
    profile?.weeklyCoachingFocus,
  );

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-8 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800/90">
        History
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
        Your meals
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
        Newest first (loads in batches). Duplicate logs a second copy with the
        same text; Split replaces one entry with two recalculated meals; Log
        again opens the home log with that text so you can adjust before
        calculating.
      </p>

      <HistoryInsightsStrip
        dailyTargetKcal={dailyTargetKcal}
        dailyTargetProteinG={dailyTargetProteinG}
        weeklyCoachingFocus={weeklyCoachingFocus}
      />
      <HistoryFortnightStrip dailyTargetKcal={dailyTargetKcal} />
      <HistoryMonthInsights
        dailyTargetKcal={dailyTargetKcal}
        dailyTargetProteinG={dailyTargetProteinG}
      />

      {meals.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-stone-300/90 bg-white/60 px-6 py-14 text-center">
          <p className="text-sm text-stone-600">
            No meals yet.{" "}
            <Link
              href="/"
              className="font-semibold text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800"
            >
              Log your first meal
            </Link>
            .
          </p>
        </div>
      ) : (
        <HistoryMealList
          initialHasMore={initialHasMore}
          meals={meals.map((m) => ({
            id: m.id,
            rawInput: m.rawInput,
            totalKcal: Number(m.totalKcal),
            createdAt: m.createdAt.toISOString(),
          }))}
        />
      )}
    </div>
  );
}

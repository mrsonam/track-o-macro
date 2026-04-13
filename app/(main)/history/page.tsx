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
import { History, PlusCircle, ArrowUpRight, Activity } from "lucide-react";
import { BodyProgressHistory } from "@/app/components/body-progress-history";
import { type UnitSystem } from "@/lib/profile/units";

export default async function HistoryPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/history");
  }

  let profile: {
    targetKcal: unknown;
    targetProteinG: unknown;
    weeklyCoachingFocus: string | null;
    unitSystem: string | null;
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
        unitSystem: true,
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
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 pb-24 pt-12">
      <div className="flex flex-col mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            <History className="h-4 w-4" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500">
            Archive Registry
          </p>
        </div>
        <h1 className="text-4xl font-black tracking-tight text-white mb-4">
          Meal History
        </h1>
        <p className="max-w-lg text-sm font-medium leading-relaxed text-zinc-500">
          Reverse-chronological event stream. Utilize protocols like 
          <span className="text-zinc-300"> Duplicate</span>, 
          <span className="text-zinc-300"> Split</span>, and 
          <span className="text-zinc-300"> Refined Log</span> to manage your database.
        </p>
      </div>

      <div className="space-y-6 mb-12">
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
        <BodyProgressHistory unitSystem={(profile?.unitSystem as UnitSystem) ?? "metric"} />
      </div>

      <div className="relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent mb-12" />
        
        {meals.length === 0 ? (
          <div className="mt-12 rounded-[2rem] border border-dashed border-white/5 bg-zinc-900/20 px-6 py-20 text-center flex flex-col items-center">
            <div className="h-16 w-16 flex items-center justify-center rounded-full bg-zinc-950 border border-white/5 text-zinc-700 mb-6">
              <PlusCircle className="h-8 w-8" />
            </div>
            <p className="text-sm font-bold text-zinc-500 mb-6">
              No personnel records identified in this segment.
            </p>
            <Link
              href="/"
              className="group btn-primary px-8 py-4 text-sm flex items-center gap-3"
            >
              Log First Entry
              <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
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
    </div>
  );
}

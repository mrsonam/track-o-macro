import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDbUnavailableError } from "@/lib/db-errors";
import { HistoryMealList } from "@/app/components/history-meal-list";
import { HISTORY_MEALS_PAGE_SIZE } from "@/lib/meals/history-meals-page";
import Link from "next/link";
import { PlusCircle, ArrowUpRight } from "lucide-react";

export async function HistoryMealsSection() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/history");
  }

  let meals;
  let initialHasMore = false;
  try {
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

  if (meals.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-zinc-950/30 px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-zinc-900/50 text-zinc-600">
          <PlusCircle className="h-7 w-7" />
        </div>
        <p className="mb-6 text-sm text-zinc-400">No meals logged yet.</p>
        <Link
          href="/"
          className="group inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-500"
        >
          Log a meal
          <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    );
  }

  return (
    <HistoryMealList
      initialHasMore={initialHasMore}
      meals={meals.map((m) => ({
        id: m.id,
        rawInput: m.rawInput,
        totalKcal: Number(m.totalKcal),
        createdAt: m.createdAt.toISOString(),
      }))}
    />
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageHeaderReveal } from "@/app/components/motion/page-header-reveal";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import {
  PreparedMealsSection,
  type PreparedMealListItem,
} from "@/app/components/prepared-meals-section";

async function PreparedMealsBody() {
  const session = await getSession();
  const userId = session?.user?.id;
  if (userId == null) {
    redirect("/login");
  }

  let rows;
  try {
    rows = await prisma.preparedMeal.findMany({
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
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  const preparedMeals: PreparedMealListItem[] = rows.map((m) => ({
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

  return <PreparedMealsSection preparedMeals={preparedMeals} />;
}

function PreparedMealsFallback() {
  return (
    <div
      className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(280px,22rem)]"
      aria-hidden
    >
      <div className="h-[28rem] motion-safe:animate-pulse rounded-[2rem] border border-black/[0.06] bg-zinc-100/80" />
      <div className="hidden h-72 motion-safe:animate-pulse rounded-[2rem] border border-black/[0.06] bg-zinc-100/80 lg:block" />
    </div>
  );
}

export default function PreparedMealsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-32 pt-10 sm:px-6 sm:pt-12">
      <PageHeaderReveal className="mb-8 flex flex-col gap-4 sm:mb-10">
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
            Batch cooking
          </p>
          <h1 className="mt-1.5 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            Prepared meals
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-600 sm:text-base">
            Save a cooked batch by total weight, preview the full nutrition breakdown, then
            log it from home by searching for the same dish name (it appears with a
            Prepared tag).
          </p>
        </div>
      </PageHeaderReveal>

      <Suspense fallback={<PreparedMealsFallback />}>
        <PreparedMealsBody />
      </Suspense>
    </div>
  );
}

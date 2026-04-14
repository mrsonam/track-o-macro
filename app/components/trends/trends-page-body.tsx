import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDbUnavailableError } from "@/lib/db-errors";
import { HistoryFortnightStrip } from "@/app/components/history-fortnight-strip";
import { HistoryWeeklyRecapStrip } from "@/app/components/history-weekly-recap-strip";
import { HistoryInsightsStrip } from "@/app/components/history-insights-strip";
import { HistoryMonthInsights } from "@/app/components/history-month-insights";
import { TrendsDashboardWrapper } from "@/app/components/trends-dashboard-wrapper";
import { WeightTrendStrip } from "@/app/components/weight-trend-strip";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { type UnitSystem } from "@/lib/profile/units";
import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";

export async function TrendsPageBody() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/trends");
  }

  let profile: {
    targetKcal: unknown;
    targetProteinG: unknown;
    weeklyCoachingFocus: string | null;
    weeklyImplementationIntention: string | null;
    activeDays14Enabled: boolean;
    unitSystem: string | null;
  } | null = null;

  try {
    profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: {
        targetKcal: true,
        targetProteinG: true,
        weeklyCoachingFocus: true,
        weeklyImplementationIntention: true,
        activeDays14Enabled: true,
        unitSystem: true,
      },
    });
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
  const weeklyCoachingFocus = parseWeeklyCoachingFocus(
    profile?.weeklyCoachingFocus,
  );
  const unitSystem = (profile?.unitSystem as UnitSystem) ?? "metric";

  return (
    <>
      <TrendsDashboardWrapper dailyTargetKcal={dailyTargetKcal} />

      <div className="flex flex-col gap-10 lg:gap-16">
        <section
          id={HISTORY_INSIGHT_ANCHORS.rollingWeek}
          aria-labelledby="trends-rolling-heading"
          className="scroll-mt-32"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
            <h2
              id="trends-rolling-heading"
              className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/50"
            >
              Rolling Momentum
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-emerald-500/20 to-transparent" />
          </div>
          <HistoryInsightsStrip
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetProteinG={dailyTargetProteinG}
            weeklyCoachingFocus={weeklyCoachingFocus}
            weeklyImplementationIntention={
              profile?.weeklyImplementationIntention ?? null
            }
            activeDays14Enabled={profile?.activeDays14Enabled ?? false}
            className="p-6 transition-colors hover:border-emerald-500/20 md:p-8 lg:p-9"
          />
        </section>

        <section
          id={HISTORY_INSIGHT_ANCHORS.weightTrend}
          aria-labelledby="trends-weight-trend"
          className="scroll-mt-32"
        >
          <WeightTrendStrip unitSystem={unitSystem} />
        </section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-0">
          <section
            id={HISTORY_INSIGHT_ANCHORS.weekRecap}
            aria-labelledby="trends-recap-heading"
            className="min-w-0 scroll-mt-32 lg:col-span-12 xl:col-span-7"
          >
            <div className="mb-5 flex items-center gap-3">
              <h2
                id="trends-recap-heading"
                className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-500/50"
              >
                Week in Review
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-teal-500/20 to-transparent" />
            </div>
            <HistoryWeeklyRecapStrip
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              weeklyImplementationIntention={
                profile?.weeklyImplementationIntention ?? null
              }
              className="h-full p-6 md:p-8 lg:p-9"
            />
          </section>

          <section
            id={HISTORY_INSIGHT_ANCHORS.fortnight}
            aria-labelledby="trends-fortnight-heading"
            className="min-w-0 scroll-mt-32 lg:col-span-12 xl:col-span-5"
          >
            <div className="mb-5 flex items-center gap-3">
              <h2
                id="trends-fortnight-heading"
                className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600"
              >
                14-Day Velocity
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
            </div>
            <HistoryFortnightStrip
              dailyTargetKcal={dailyTargetKcal}
              className="h-full p-6 md:p-8 lg:p-9"
            />
          </section>
        </div>

        <section
          id={HISTORY_INSIGHT_ANCHORS.month}
          aria-labelledby="trends-month-heading"
          className="scroll-mt-32 pb-2"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
            <h2
              id="trends-month-heading"
              className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600"
            >
              Historical Archive
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-white/5 to-transparent" />
          </div>
          <HistoryMonthInsights
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetProteinG={dailyTargetProteinG}
            className="mb-0 p-6 md:p-8 lg:p-9"
          />
        </section>
      </div>
    </>
  );
}

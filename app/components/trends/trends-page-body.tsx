import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDbUnavailableError } from "@/lib/db-errors";
import { TrendsFortnightStrip } from "@/app/components/trends-fortnight-strip";
import { TrendsWeeklyRecapStrip } from "@/app/components/trends-weekly-recap-strip";
import { TrendsInsightsStrip } from "@/app/components/trends-insights-strip";
import { TrendsMonthInsights } from "@/app/components/trends-month-insights";
import { TrendsDashboardWrapper } from "@/app/components/trends-dashboard-wrapper";
import { WeightTrendStrip } from "@/app/components/weight-trend-strip";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { type UnitSystem } from "@/lib/profile/units";
import { TRENDS_INSIGHT_ANCHORS } from "@/lib/meals/trends-insight-anchors";

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
          id={TRENDS_INSIGHT_ANCHORS.rollingWeek}
          aria-labelledby="trends-rolling-heading"
          className="scroll-mt-32"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-[#4f9d45]/35 to-transparent" />
            <h2
              id="trends-rolling-heading"
              className="text-[10px] font-black uppercase tracking-[0.4em] text-[#4f9d45]"
            >
              Rolling Momentum
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-[#4f9d45]/35 to-transparent" />
          </div>
          <TrendsInsightsStrip
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
          id={TRENDS_INSIGHT_ANCHORS.weightTrend}
          aria-labelledby="trends-weight-trend"
          className="scroll-mt-32"
        >
          <WeightTrendStrip unitSystem={unitSystem} />
        </section>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-0">
          <section
            id={TRENDS_INSIGHT_ANCHORS.weekRecap}
            aria-labelledby="trends-recap-heading"
            className="min-w-0 scroll-mt-32 lg:col-span-12 xl:col-span-7"
          >
            <div className="mb-5 flex items-center gap-3">
              <h2
                id="trends-recap-heading"
                className="text-[10px] font-black uppercase tracking-[0.4em] text-[#3b82a0]"
              >
                Week in Review
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-[#3b82a0]/25 to-transparent" />
            </div>
            <TrendsWeeklyRecapStrip
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              weeklyImplementationIntention={
                profile?.weeklyImplementationIntention ?? null
              }
              className="h-full p-6 md:p-8 lg:p-9"
            />
          </section>

          <section
            id={TRENDS_INSIGHT_ANCHORS.fortnight}
            aria-labelledby="trends-fortnight-heading"
            className="min-w-0 scroll-mt-32 lg:col-span-12 xl:col-span-5"
          >
            <div className="mb-5 flex items-center gap-3">
              <h2
                id="trends-fortnight-heading"
                className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700"
              >
                14-Day Velocity
              </h2>
              <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent" />
            </div>
            <TrendsFortnightStrip
              dailyTargetKcal={dailyTargetKcal}
              className="h-full p-6 md:p-8 lg:p-9"
            />
          </section>
        </div>

        <section
          id={TRENDS_INSIGHT_ANCHORS.month}
          aria-labelledby="trends-month-heading"
          className="scroll-mt-32 pb-2"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-gradient-to-r from-black/10 to-transparent" />
            <h2
              id="trends-month-heading"
              className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-700"
            >
              Historical Archive
            </h2>
            <div className="h-px flex-1 bg-gradient-to-l from-black/10 to-transparent" />
          </div>
          <TrendsMonthInsights
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetProteinG={dailyTargetProteinG}
            className="mb-0 p-6 md:p-8 lg:p-9"
          />
        </section>
      </div>
    </>
  );
}

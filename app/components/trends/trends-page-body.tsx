import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { isDbUnavailableError } from "@/lib/db-errors";
import { TrendsFortnightStrip } from "@/app/components/trends-fortnight-strip";
import { TrendsWeeklyRecapStrip } from "@/app/components/trends-weekly-recap-strip";
import { TrendsInsightsStrip } from "@/app/components/trends-insights-strip";
import { TrendsMonthInsights } from "@/app/components/trends-month-insights";
import { TrendsInsightsProvider } from "@/app/components/trends/trends-insights-provider";
import { WeightTrendStrip } from "@/app/components/weight-trend-strip";
import { parseWeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import { type UnitSystem } from "@/lib/profile/units";
import { TRENDS_INSIGHT_ANCHORS } from "@/lib/meals/trends-insight-anchors";
import { SectionReveal } from "@/app/components/motion/section-reveal";
import { TrendsSectionHeading } from "@/app/components/trends/trends-section-heading";
import { trends } from "@/lib/ui/trends-tokens";
import { BarChart3, Calendar, History, Scale, TrendingUp } from "lucide-react";

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

  const panelPad = "p-6 md:p-8 lg:p-9";

  return (
    <TrendsInsightsProvider
      dailyTargetKcal={dailyTargetKcal}
      dailyTargetProteinG={dailyTargetProteinG}
      activeDays14Enabled={profile?.activeDays14Enabled ?? false}
    >
      <div className="flex flex-col gap-12 lg:gap-16">
        <SectionReveal className="scroll-mt-32">
          <section
            id={TRENDS_INSIGHT_ANCHORS.rollingWeek}
            aria-labelledby="trends-rolling-heading"
            className="scroll-mt-32"
          >
            <TrendsSectionHeading
              id="trends-rolling-heading"
              title="Rolling week"
              description="Seven-day averages, logging coverage, and weekend vs weekday drift."
              icon={TrendingUp}
              accent="signal"
            />
            <TrendsInsightsStrip
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              weeklyCoachingFocus={weeklyCoachingFocus}
              weeklyImplementationIntention={
                profile?.weeklyImplementationIntention ?? null
              }
              activeDays14Enabled={profile?.activeDays14Enabled ?? false}
              className={`${trends.panel} ${panelPad}`}
            />
          </section>
        </SectionReveal>

        <SectionReveal className="scroll-mt-32">
          <section
            id={TRENDS_INSIGHT_ANCHORS.weightTrend}
            aria-labelledby="trends-weight-heading"
            className="scroll-mt-32"
          >
            <TrendsSectionHeading
              id="trends-weight-heading"
              title="Weight trend"
              description="Recent weigh-ins plotted against your calorie window."
              icon={Scale}
              accent="neutral"
            />
            <WeightTrendStrip unitSystem={unitSystem} className={`${trends.panel} ${panelPad}`} />
          </section>
        </SectionReveal>

        <SectionReveal>
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-12 xl:gap-y-0">
            <section
              id={TRENDS_INSIGHT_ANCHORS.weekRecap}
              aria-labelledby="trends-recap-heading"
              className="min-w-0 scroll-mt-32 lg:col-span-12 xl:col-span-7"
            >
              <TrendsSectionHeading
                id="trends-recap-heading"
                title="Week in review"
                description="Wins and friction surfaced from this week’s logs."
                icon={History}
                accent="carb"
              />
              <TrendsWeeklyRecapStrip
                dailyTargetKcal={dailyTargetKcal}
                dailyTargetProteinG={dailyTargetProteinG}
                weeklyImplementationIntention={
                  profile?.weeklyImplementationIntention ?? null
                }
                className={`h-full ${trends.panel} ${panelPad}`}
              />
            </section>

            <section
              id={TRENDS_INSIGHT_ANCHORS.fortnight}
              aria-labelledby="trends-fortnight-heading"
              className="min-w-0 scroll-mt-32 mt-6 lg:col-span-12 lg:mt-0 xl:col-span-5"
            >
              <TrendsSectionHeading
                id="trends-fortnight-heading"
                title="Last 14 days"
                description="Broader rhythm check beyond the rolling week."
                icon={BarChart3}
                accent="neutral"
              />
              <TrendsFortnightStrip
                dailyTargetKcal={dailyTargetKcal}
                className={`h-full ${trends.panel} ${panelPad}`}
              />
            </section>
          </div>
        </SectionReveal>

        <SectionReveal className="scroll-mt-32 mt-10 pb-2 lg:mt-12">
          <section
            id={TRENDS_INSIGHT_ANCHORS.month}
            aria-labelledby="trends-month-heading"
            className="scroll-mt-32 pb-2"
          >
            <TrendsSectionHeading
              id="trends-month-heading"
              title="Monthly history"
              description="Pick any month for totals, coverage, and daily averages."
              icon={Calendar}
              accent="neutral"
            />
            <TrendsMonthInsights
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              className={`mb-0 ${trends.panel} ${panelPad}`}
            />
          </section>
        </SectionReveal>
      </div>
    </TrendsInsightsProvider>
  );
}

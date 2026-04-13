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
import { BarChart3, Sparkles } from "lucide-react";
import { HISTORY_INSIGHT_ANCHORS } from "@/lib/meals/history-insight-anchors";

export default async function TrendsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/trends");
  }

  let profile: any = null;

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
    <div className="flex flex-col min-h-screen pb-20">
      {/* Premium Header Section */}
      <header className="mb-12 flex flex-col gap-8 lg:mb-16">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
          <div className="flex min-w-0 flex-1 items-start gap-5 sm:gap-6">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-lime-500 opacity-25 blur transition duration-1000 group-hover:opacity-40" />
              <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 border border-white/10 text-emerald-400 shadow-2xl">
                <BarChart3 className="h-7 w-7" strokeWidth={2} aria-hidden />
              </div>
            </div>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
                  Analytics Engine
                </p>
                <div className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-emerald-500 border border-emerald-500/20">
                  <Sparkles className="h-2 w-2" />
                  Live
                </div>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Trends & Patterns
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-500 sm:text-[17px]">
                Rolling windows, weekly recap, and calendar months — all aligned to
                your local dates. Use this space to scan patterns and optimize your metabolic health.
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Global Intelligence & Navigation */}
      <TrendsDashboardWrapper dailyTargetKcal={dailyTargetKcal} />

      <div className="flex flex-col gap-10 lg:gap-16">
        {/* Main Trends Section */}
        <section 
          id={HISTORY_INSIGHT_ANCHORS.rollingWeek} 
          aria-labelledby="trends-rolling-heading"
          className="scroll-mt-32"
        >
          <div className="flex items-center gap-3 mb-5">
             <div className="h-px flex-1 bg-gradient-to-r from-emerald-500/20 to-transparent" />
             <h2 id="trends-rolling-heading" className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/50">
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
            className="p-6 md:p-8 lg:p-9 hover:border-emerald-500/20 transition-colors"
          />
        </section>

        <section
          id={HISTORY_INSIGHT_ANCHORS.weightTrend}
          aria-labelledby="trends-weight-trend"
          className="scroll-mt-32"
        >
          <WeightTrendStrip unitSystem={unitSystem} />
        </section>

        {/* Tactical Recaps Grid */}
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-x-10 lg:gap-y-0">
          <section
            id={HISTORY_INSIGHT_ANCHORS.weekRecap}
            aria-labelledby="trends-recap-heading"
            className="min-w-0 lg:col-span-12 xl:col-span-7 scroll-mt-32"
          >
            <div className="flex items-center gap-3 mb-5">
               <h2 id="trends-recap-heading" className="text-[10px] font-black uppercase tracking-[0.4em] text-teal-500/50">
                 Week in Review
               </h2>
               <div className="h-px flex-1 bg-gradient-to-r from-teal-500/20 to-transparent" />
            </div>
            <HistoryWeeklyRecapStrip
              dailyTargetKcal={dailyTargetKcal}
              dailyTargetProteinG={dailyTargetProteinG}
              className="p-6 md:p-8 lg:p-9 h-full"
            />
          </section>

          <section
            id={HISTORY_INSIGHT_ANCHORS.fortnight}
            aria-labelledby="trends-fortnight-heading"
            className="min-w-0 lg:col-span-12 xl:col-span-5 scroll-mt-32"
          >
            <div className="flex items-center gap-3 mb-5">
               <h2 id="trends-fortnight-heading" className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
                 14-Day Velocity
               </h2>
               <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
            </div>
            <HistoryFortnightStrip
              dailyTargetKcal={dailyTargetKcal}
              className="p-6 md:p-8 lg:p-9 h-full"
            />
          </section>
        </div>

        {/* Monthly Archive */}
        <section 
          id={HISTORY_INSIGHT_ANCHORS.month} 
          aria-labelledby="trends-month-heading" 
          className="pb-2 scroll-mt-32"
        >
          <div className="flex items-center gap-3 mb-5">
             <div className="h-px flex-1 bg-gradient-to-r from-white/5 to-transparent" />
             <h2 id="trends-month-heading" className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-600">
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
    </div>
  );
}

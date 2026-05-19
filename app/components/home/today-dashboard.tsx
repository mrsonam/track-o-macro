"use client";

import { DaySummaryCard } from "@/app/components/day-summary-card";
import { AdaptiveTargetCard } from "@/app/components/adaptive-target-card";
import { WeightLogCard } from "@/app/components/weight-log-card";
import { WeekCalorieStrip } from "@/app/components/week-calorie-strip";
import {
  WeekInsightsCard,
  type WeekInsightPayload,
} from "@/app/components/week-insights-card";
import type { MealDaySummary } from "@/lib/meals/meal-day-summary";
import type { WeeklyCoachingFocus } from "@/lib/meals/weekly-coaching-focus";
import type { UnitSystem } from "@/lib/profile/units";
import { TodayDayHydrationBand } from "./today-day-hydration-band";
import { TodayDayMealsList } from "./today-day-meals-list";
import { TodayDayTimingCard } from "./today-day-timing-card";
import { TodayEmptyDayPrompt } from "./today-empty-day-prompt";
import { TodayPageHeader } from "./today-page-header";

export type TodayDashboardProps = {
  selectedDateKey: string;
  onSelectDateKey: (ymd: string) => void;
  rollingDateKeys: string[];
  summariesByKey: Record<string, MealDaySummary | null | undefined>;
  weekBatchLoading: boolean;
  weekBatchError: string | null;
  dailyTargetKcal: number | null;
  dailyTargetProteinG: number | null;
  dailyTargetHydrationMl: number;
  unitSystem: UnitSystem;
  weightTrendOnHomeEnabled: boolean;
  weightCardKey: number;
  weeklyCoachingFocus: WeeklyCoachingFocus | null;
  weekInsightData: WeekInsightPayload | null;
};

export function TodayDashboard({
  selectedDateKey,
  onSelectDateKey,
  rollingDateKeys,
  summariesByKey,
  weekBatchLoading,
  weekBatchError,
  dailyTargetKcal,
  dailyTargetProteinG,
  dailyTargetHydrationMl,
  unitSystem,
  weightTrendOnHomeEnabled,
  weightCardKey,
  weeklyCoachingFocus,
  weekInsightData,
}: TodayDashboardProps) {
  const selectedSummary = summariesByKey[selectedDateKey];
  const showEmptyPrompt =
    !weekBatchLoading &&
    !weekBatchError &&
    selectedSummary != null &&
    selectedSummary.mealCount === 0;

  const mealsListMissing =
    !weekBatchLoading &&
    !weekBatchError &&
    selectedSummary != null &&
    selectedSummary.mealCount > 0 &&
    (!selectedSummary.meals || selectedSummary.meals.length === 0);

  return (
    <div className="mb-8 flex flex-col gap-6">
      <TodayPageHeader selectedDateKey={selectedDateKey} />

      <section aria-label="Last 7 days">
        <WeekCalorieStrip
          dateKeys={rollingDateKeys}
          selectedDateKey={selectedDateKey}
          onSelectDateKey={onSelectDateKey}
          dailyTargetKcal={dailyTargetKcal}
          dailyTargetHydrationMl={dailyTargetHydrationMl}
          unitSystem={unitSystem}
          summariesByKey={summariesByKey}
          batchLoading={weekBatchLoading}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start lg:gap-8">
        <section
          aria-label="Daily summary and meals"
          className="flex flex-col gap-6 lg:col-span-8"
        >
          <DaySummaryCard
            dateKey={selectedDateKey}
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetProteinG={dailyTargetProteinG}
            loading={weekBatchLoading}
            batchError={weekBatchError}
            summary={selectedSummary}
          />

          {showEmptyPrompt ? (
            <TodayEmptyDayPrompt selectedDateKey={selectedDateKey} />
          ) : null}

          {!weekBatchLoading &&
          !weekBatchError &&
          selectedSummary &&
          selectedSummary.mealCount > 0 ? (
            <>
              <TodayDayHydrationBand
                selectedDateKey={selectedDateKey}
                summary={selectedSummary}
                dailyTargetHydrationMl={dailyTargetHydrationMl}
                unitSystem={unitSystem}
              />
              {selectedSummary.timing &&
              selectedSummary.timing.total_kcal > 0 ? (
                <TodayDayTimingCard timing={selectedSummary.timing} />
              ) : null}
              {mealsListMissing ? (
                <p
                  role="alert"
                  className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-xs font-bold text-amber-900"
                >
                  Meal list did not load. Switch days or try again.
                </p>
              ) : (
                <TodayDayMealsList
                  dateKey={selectedDateKey}
                  meals={selectedSummary.meals ?? []}
                  loading={weekBatchLoading}
                  error={weekBatchError}
                />
              )}
            </>
          ) : null}
        </section>

        <aside
          aria-label="Weight and weekly insights"
          className="flex flex-col gap-6 lg:col-span-4"
        >
          <WeightLogCard
            unitSystem={unitSystem}
            weightTrendOnHomeEnabled={weightTrendOnHomeEnabled}
            key={`weight-${weightCardKey}`}
          />
          <WeekInsightsCard
            dailyTargetKcal={dailyTargetKcal}
            dailyTargetProteinG={dailyTargetProteinG}
            weeklyCoachingFocus={weeklyCoachingFocus}
            loading={weekBatchLoading}
            batchError={weekBatchError}
            data={weekInsightData}
          />
          <AdaptiveTargetCard key={`adaptive-${weightCardKey}`} />
        </aside>
      </div>
    </div>
  );
}

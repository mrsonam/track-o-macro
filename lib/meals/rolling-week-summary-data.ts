export type RollingWeekSummaryData = {
  mealCount: number;
  daysInWindow: number;
  daysWithLogs: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g?: number;
    sodium_mg?: number;
    sugar_g?: number;
    added_sugar_g?: number;
  };
  averages: {
    kcalPerDay: number;
    proteinGPerDay: number;
    fiberGPerDay?: number;
    sodiumMgPerDay?: number;
    sugarGPerDay?: number;
    addedSugarGPerDay?: number;
  };
  drifts?: {
    weekendAvgKcal: number | null;
    weekdayAvgKcal: number | null;
  };
  patterns?: {
    weekendDriftLine?: string | null;
    mealTimingBandLine?: string | null;
    lateEatingLine?: string | null;
  };
  /** Last 14 local days: days with ≥1 meal (Epic 5 recovery framing). */
  recovery14?: {
    daysWithLogs: number;
    daysInWindow: 14;
  };
};

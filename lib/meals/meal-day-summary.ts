export type MealDriver = {
  rawInput: string;
  value: number;
};

export type MealDaySummary = {
  from?: string;
  to?: string;
  mealCount: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    sodium_mg: number;
    sugar_g: number;
    /** Sum where line items reported added sugars; omitted when unknown */
    added_sugar_g?: number | null;
  };
  /** Local-hour kcal split when the client requested timing on batch/summary */
  timing?: {
    morning_kcal: number;
    midday_kcal: number;
    evening_kcal: number;
    late_night_kcal: number;
    total_kcal: number;
  } | null;
  drivers?: {
    kcal?: MealDriver;
    sodium?: MealDriver;
    sugar?: MealDriver;
    /** Meal with highest logged protein that day (for distribution copy) */
    protein?: MealDriver;
  };
};

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
  };
  drivers?: {
    kcal?: MealDriver;
    sodium?: MealDriver;
    sugar?: MealDriver;
  };
};

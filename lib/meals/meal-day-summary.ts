/** One calendar day aggregate (matches /api/meals/summary item shape). */
export type MealDaySummary = {
  mealCount: number;
  totals: {
    kcal: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
};

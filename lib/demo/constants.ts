export const DEMO_EMAIL = "demo@trackomacro.app";
export const DEMO_PASSWORD = "Demo12345";

export const DEMO_HEIGHT_CM = 168;
export const DEMO_START_WEIGHT_KG = 86;
export const DEMO_GOAL_WEIGHT_KG = 80;
export const DEMO_BACKFILL_DAYS = 60;

export const DEMO_PROFILE = {
  age: 32,
  sex: "unspecified",
  activityLevel: "moderate",
  goalIntent: "lose",
  goalPace: "moderate",
  targetKcal: 1950,
  targetProteinG: 120,
  loggingStyle: "quick_estimates",
  dietaryPattern: "omnivore",
  unitSystem: "metric",
} as const;

export type PreparedMealKey = "chicken_rice_broccoli" | "overnight_oats";

export const DEMO_PREPARED_MEALS: Record<
  PreparedMealKey,
  {
    title: string;
    recipeRawInput: string;
    preparedGrams: number;
    portionGrams: number;
    batchTotalKcal: number;
    batchTotalProteinG: number;
    batchTotalCarbsG: number;
    batchTotalFatG: number;
    batchTotalFiberG: number;
    batchTotalSodiumMg: number;
    batchTotalSugarG: number;
  }
> = {
  chicken_rice_broccoli: {
    title: "Meal-prepped chicken, rice & broccoli",
    recipeRawInput:
      "8 chicken breasts, 4 cups jasmine rice, 6 cups broccoli, olive oil, garlic, soy sauce",
    preparedGrams: 2800,
    portionGrams: 350,
    batchTotalKcal: 4200,
    batchTotalProteinG: 380,
    batchTotalCarbsG: 460,
    batchTotalFatG: 90,
    batchTotalFiberG: 42,
    batchTotalSodiumMg: 5200,
    batchTotalSugarG: 18,
  },
  overnight_oats: {
    title: "Overnight oats batch",
    recipeRawInput:
      "6 cups rolled oats, 6 cups milk, 4 tbsp chia seeds, honey, cinnamon",
    preparedGrams: 1800,
    portionGrams: 300,
    batchTotalKcal: 2700,
    batchTotalProteinG: 90,
    batchTotalCarbsG: 420,
    batchTotalFatG: 60,
    batchTotalFiberG: 48,
    batchTotalSodiumMg: 900,
    batchTotalSugarG: 140,
  },
};

export const DEMO_SAVED_MEALS: Array<{ title: string; rawInput: string }> = [
  { title: "Protein shake + banana", rawInput: "Protein shake with 1 banana" },
  {
    title: "Greek yogurt bowl",
    rawInput: "Greek yogurt, granola, mixed berries, honey",
  },
  {
    title: "Chicken salad wrap",
    rawInput: "Grilled chicken salad wrap, whole wheat tortilla",
  },
];

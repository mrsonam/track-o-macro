import {
  DEMO_GOAL_WEIGHT_KG,
  DEMO_PREPARED_MEALS,
  DEMO_START_WEIGHT_KG,
  type PreparedMealKey,
} from "@/lib/demo/constants";

export type DemoMealLinePlan = {
  label: string;
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
  sodiumMg: number;
  sugarG: number;
};

export type DemoMealPlan = {
  rawInput: string;
  hour: number;
  minute: number;
  lines: DemoMealLinePlan[];
};

export type DemoPreparedPortionPlan = {
  preparedMealKey: PreparedMealKey;
  portionGrams: number;
  hour: number;
  minute: number;
};

export type DemoFluidPlan = {
  volumeMl: number;
  kind: "water" | "tea" | "coffee";
  note: string | null;
  hour: number;
  minute: number;
};

export type DemoDayPlan = {
  meals: DemoMealPlan[];
  preparedPortion: DemoPreparedPortionPlan | null;
  fluids: DemoFluidPlan[];
};

/** Deterministic pseudo-random in [0,1) from two integer seeds. */
function jitter(a: number, b: number): number {
  const x = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Whole-day index since the Unix epoch (UTC); seeds deterministic day-to-day variety. */
export function epochDayIndex(date: Date): number {
  return Math.floor(date.getTime() / 86_400_000);
}

/** Weigh-in cadence: Monday, Wednesday, Friday (UTC) — roughly 3x/week. */
export function shouldLogWeightOnDate(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 1 || day === 3 || day === 5;
}

/** Linear interpolation from start to goal weight across the initial backfill window. */
export function weightKgForBackfillDay(
  dayIndex: number,
  totalDays: number,
): number {
  const t = totalDays <= 1 ? 1 : dayIndex / (totalDays - 1);
  const clamped = Math.min(1, Math.max(0, t));
  return round1(
    DEMO_START_WEIGHT_KG + (DEMO_GOAL_WEIGHT_KG - DEMO_START_WEIGHT_KG) * clamped,
  );
}

/** Small deterministic wobble around goal weight for the post-backfill "maintenance" phase. */
export function nextMaintenanceWeightKg(date: Date): number {
  const wobble = (jitter(epochDayIndex(date), 41) - 0.5) * 1.6;
  return round1(DEMO_GOAL_WEIGHT_KG + wobble);
}

function splitMacros(kcal: number, seed: number) {
  const pRatio = 0.22 + jitter(seed, 2) * 0.12;
  const cRatio = 0.38 + jitter(seed, 3) * 0.12;
  const fRatio = Math.max(0.18, 1 - pRatio - cRatio);
  return {
    proteinG: round1((kcal * pRatio) / 4),
    carbsG: round1((kcal * cRatio) / 4),
    fatG: round1((kcal * fRatio) / 9),
    fiberG: round1(6 + jitter(seed, 4) * 12),
  };
}

function buildLine(label: string, kcal: number, seed: number): DemoMealLinePlan {
  const macros = splitMacros(kcal, seed);
  return {
    label,
    kcal: round1(kcal),
    proteinG: macros.proteinG,
    carbsG: macros.carbsG,
    fatG: macros.fatG,
    fiberG: macros.fiberG,
    sodiumMg: Math.round(180 + kcal * 0.35),
    sugarG: round1(Math.max(0, kcal * 0.025)),
  };
}

const BREAKFAST_POOL = [
  { label1: "Oatmeal, milk, banana, walnuts", label2: "Espresso, orange juice" },
  { label1: "Scrambled eggs, whole grain toast, avocado", label2: "Latte, fruit" },
] as const;

const LUNCH_POOL = [
  {
    label1: "Grilled chicken breast, mixed greens, vinaigrette",
    label2: "Brown rice, black beans",
  },
  {
    label1: "Turkey sandwich, whole wheat bread, lettuce, tomato",
    label2: "Side salad, apple",
  },
] as const;

const DINNER_POOL = [
  { label1: "Salmon fillet, roasted potatoes, asparagus", label2: "Greek yogurt, berries" },
  { label1: "Lean beef stir-fry, jasmine rice, peppers", label2: "Side salad, olive oil" },
] as const;

function pick<T>(pool: readonly T[], seed: number, salt: number): T {
  const idx = Math.floor(jitter(seed, salt) * pool.length) % pool.length;
  return pool[idx]!;
}

function buildMeal(
  rawLabel: string,
  pair: { label1: string; label2: string },
  targetKcal: number,
  hour: number,
  minute: number,
  seed: number,
): DemoMealPlan {
  const k1 = Math.round(targetKcal * 0.58);
  const k2 = targetKcal - k1;
  return {
    rawInput: `${rawLabel}: ${pair.label1}; ${pair.label2}`,
    hour,
    minute,
    lines: [
      buildLine(pair.label1, k1, seed * 10 + 1),
      buildLine(pair.label2, k2, seed * 10 + 2),
    ],
  };
}

/** Every 4th day includes a portion from one of the two seeded prepared-meal batches. */
function preparedPortionForDate(date: Date): DemoPreparedPortionPlan | null {
  const seed = epochDayIndex(date);
  if (seed % 4 !== 0) return null;
  const key: PreparedMealKey =
    seed % 8 === 0 ? "chicken_rice_broccoli" : "overnight_oats";
  return {
    preparedMealKey: key,
    portionGrams: DEMO_PREPARED_MEALS[key].portionGrams,
    hour: 12,
    minute: 30,
  };
}

function dayTargetKcal(seed: number): number {
  const base = 1550 + Math.floor(jitter(seed, 1) * 550);
  const wave = Math.sin((seed / 60) * Math.PI * 2) * 120;
  return Math.round(Math.min(2400, Math.max(1250, base + wave)));
}

/** Pure: builds one realistic day of meals/fluids/prepared-portion for a given calendar date. */
export function generateDemoDay(date: Date): DemoDayPlan {
  const seed = epochDayIndex(date);
  const target = dayTargetKcal(seed);
  const prepared = preparedPortionForDate(date);
  const nMeals = jitter(seed, 7) > 0.35 ? 3 : 2;

  const meals: DemoMealPlan[] = [];
  if (nMeals === 3) {
    meals.push(
      buildMeal("Breakfast", pick(BREAKFAST_POOL, seed, 21), Math.round(target * 0.26), 8, 10, seed + 1),
    );
    if (!prepared) {
      meals.push(
        buildMeal("Lunch", pick(LUNCH_POOL, seed, 22), Math.round(target * 0.36), 12, 20, seed + 2),
      );
    }
    meals.push(
      buildMeal(
        "Dinner",
        pick(DINNER_POOL, seed, 23),
        Math.round(target * (prepared ? 0.3 : 0.38)),
        19,
        10,
        seed + 3,
      ),
    );
  } else {
    meals.push(
      buildMeal("Breakfast", pick(BREAKFAST_POOL, seed, 21), Math.round(target * 0.44), 8, 10, seed + 1),
    );
    if (!prepared) {
      meals.push(
        buildMeal("Dinner", pick(DINNER_POOL, seed, 23), Math.round(target * 0.56), 18, 10, seed + 3),
      );
    }
  }

  const fluidBase = 1600 + Math.floor(jitter(seed, 13) * 900);
  const fluidParts: Array<{
    frac: number;
    kind: DemoFluidPlan["kind"];
    note: string | null;
    hour: number;
    minute: number;
  }> = [
    { frac: 0.42, kind: "water", note: "Morning", hour: 7, minute: 15 },
    { frac: 0.28, kind: "tea", note: null, hour: 11, minute: 0 },
    { frac: 0.22, kind: "coffee", note: null, hour: 15, minute: 30 },
    { frac: 0.08, kind: "water", note: "Evening", hour: 20, minute: 45 },
  ];
  const fluids: DemoFluidPlan[] = fluidParts
    .map((p) => ({
      volumeMl: Math.round(fluidBase * p.frac),
      kind: p.kind,
      note: p.note,
      hour: p.hour,
      minute: p.minute,
    }))
    .filter((f) => f.volumeMl >= 40);

  return { meals, preparedPortion: prepared, fluids };
}

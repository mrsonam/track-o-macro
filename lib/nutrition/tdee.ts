/**
 * Mifflin–St Jeor BMR (kcal/day). "unspecified" uses the midpoint between male and female formulas.
 * Educational estimate only — not medical advice.
 */
export type SexForBmr = "male" | "female" | "unspecified";

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

export type GoalIntent = "lose" | "maintain" | "gain";

/** Size of deficit (lose) or surplus (gain). Ignored when goal is maintain. */
export type GoalPace = "gentle" | "moderate" | "aggressive";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function activityMultiplier(level: ActivityLevel): number {
  return ACTIVITY_MULTIPLIERS[level];
}

export function calculateBmrKcal(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: SexForBmr,
): number {
  const w = 10 * weightKg;
  const h = 6.25 * heightCm;
  const a = 5 * age;
  if (sex === "male") return w + h - a + 5;
  if (sex === "female") return w + h - a - 161;
  return w + h - a - 78;
}

export function calculateTdeeKcal(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: SexForBmr,
  activity: ActivityLevel,
): number {
  const bmr = calculateBmrKcal(weightKg, heightCm, age, sex);
  return Math.round(bmr * activityMultiplier(activity));
}

const LOSE_DEFICIT: Record<GoalPace, number> = {
  gentle: 250,
  moderate: 400,
  aggressive: 550,
};

const GAIN_SURPLUS: Record<GoalPace, number> = {
  gentle: 200,
  moderate: 300,
  aggressive: 450,
};

/** Goal-adjusted daily calorie target (rounded). `pace` defaults to moderate. */
export function calculateTargetKcal(
  tdee: number,
  goal: GoalIntent,
  pace: GoalPace = "moderate",
): number {
  if (goal === "lose") {
    return Math.round(tdee - LOSE_DEFICIT[pace]);
  }
  if (goal === "gain") {
    return Math.round(tdee + GAIN_SURPLUS[pace]);
  }
  return Math.round(tdee);
}

export const ACTIVITY_LABELS: Record<
  ActivityLevel,
  { title: string; desc: string }
> = {
  sedentary: {
    title: "Mostly seated",
    desc: "Desk job, little structured exercise.",
  },
  light: {
    title: "Light",
    desc: "Light exercise or walking 1–3 days/week.",
  },
  moderate: {
    title: "Moderate",
    desc: "Moderate exercise 3–5 days/week.",
  },
  active: {
    title: "Active",
    desc: "Hard exercise 6–7 days/week or physical job.",
  },
  very_active: {
    title: "Very active",
    desc: "Athlete-level training or very demanding daily work.",
  },
};

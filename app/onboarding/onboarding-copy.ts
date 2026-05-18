export const ONBOARDING_STEPS = [
  "welcome",
  "experience",
  "goal",
  "metrics",
  "activity",
  "preferences",
  "safety",
  "review",
  "done",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

export const ONBOARDING_LAST_STEP_INDEX = ONBOARDING_STEPS.length - 1;

export const STEP_META: Record<
  OnboardingStepId,
  { title: string; description: string; shortLabel: string }
> = {
  welcome: {
    shortLabel: "Welcome",
    title: "Welcome to TrackOMacro",
    description:
      "Answer a few questions so we can estimate your daily calories and macros. You can change everything later in settings.",
  },
  experience: {
    shortLabel: "Experience",
    title: "How familiar are you with tracking?",
    description: "This sets how much detail you see on your dashboard.",
  },
  goal: {
    shortLabel: "Goal",
    title: "What is your goal right now?",
    description: "We use this to suggest a daily calorie target.",
  },
  metrics: {
    shortLabel: "About you",
    title: "A few details about you",
    description: "Used only to estimate your energy needs. Not shared publicly.",
  },
  activity: {
    shortLabel: "Activity",
    title: "How active are you most weeks?",
    description: "Pick the option that best matches a typical week, not your best day.",
  },
  preferences: {
    shortLabel: "Preferences",
    title: "How do you like to log?",
    description: "Helps us set sensible defaults. You can skip fine-tuning later.",
  },
  safety: {
    shortLabel: "Safety",
    title: "Before you continue",
    description: "Please read this. TrackOMacro supports tracking, not medical care.",
  },
  review: {
    shortLabel: "Review",
    title: "Your starting targets",
    description: "Estimates from your answers. Adjust anytime after setup.",
  },
  done: {
    shortLabel: "Done",
    title: "You are all set",
    description: "Your profile is saved. Head to the dashboard to log your first meal.",
  },
};

export const EXPERIENCE_OPTIONS = [
  {
    id: "beginner" as const,
    title: "Getting started",
    desc: "Focus on calories first. Macros appear when you are ready.",
  },
  {
    id: "intermediate" as const,
    title: "Comfortable tracking",
    desc: "Calories plus protein, carbs, and fat each day.",
  },
  {
    id: "advanced" as const,
    title: "Detailed tracking",
    desc: "Full control over grams, ratios, and targets.",
  },
] as const;

export const GOAL_OPTIONS = [
  {
    id: "lose" as const,
    title: "Lose weight",
    desc: "A moderate deficit with enough protein for day-to-day life.",
  },
  {
    id: "maintain" as const,
    title: "Maintain",
    desc: "Stay close to your current weight.",
  },
  {
    id: "gain" as const,
    title: "Gain weight",
    desc: "A controlled surplus for strength or size goals.",
  },
] as const;

export const PACE_LABELS: Record<"gentle" | "moderate" | "aggressive", string> = {
  gentle: "Gentle",
  moderate: "Moderate",
  aggressive: "Faster",
};

export const WEEKLY_COACHING_FOCUS_DB_VALUES = [
  "protein",
  "vegetables",
  "hydration",
  "steady_calories",
] as const;

export type WeeklyCoachingFocus =
  (typeof WEEKLY_COACHING_FOCUS_DB_VALUES)[number];

export function parseWeeklyCoachingFocus(
  raw: string | null | undefined,
): WeeklyCoachingFocus | null {
  if (raw == null || raw === "") return null;
  if (
    (WEEKLY_COACHING_FOCUS_DB_VALUES as readonly string[]).includes(
      raw as WeeklyCoachingFocus,
    )
  ) {
    return raw as WeeklyCoachingFocus;
  }
  return null;
}

/** One line when data-driven heuristics did not fire. */
export function weeklyCoachingFocusTip(f: WeeklyCoachingFocus): string {
  switch (f) {
    case "protein":
      return "You chose protein—try one reliable source earlier (eggs, yogurt, tofu, canned fish) so you are not chasing it late.";
    case "vegetables":
      return "You chose vegetables—add one fist-sized portion where it fits (fresh, frozen, or salad all count).";
    case "hydration":
      return "You chose hydration—pair a glass of water with something you already do (after coffee, before dinner).";
    case "steady_calories":
      return "You chose steadier calories—roughly similar-sized mains on busy days beat one huge catch-up.";
  }
}

export const WEEKLY_COACHING_FOCUS_UI: ReadonlyArray<{
  value: WeeklyCoachingFocus | "";
  label: string;
}> = [
  { value: "", label: "No extra weekly tip" },
  { value: "protein", label: "Protein earlier in the day" },
  { value: "vegetables", label: "More vegetables" },
  { value: "hydration", label: "Hydration" },
  { value: "steady_calories", label: "Steadier meal sizes" },
];

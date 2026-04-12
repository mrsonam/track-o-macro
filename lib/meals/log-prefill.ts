/** Pass meal text from History (or elsewhere) into the home log box after navigation. */
export const MEAL_LOG_PREFILL_KEY = "calorie-pwa:log-prefill";

export function stashMealLogPrefill(text: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(MEAL_LOG_PREFILL_KEY, text);
  } catch {
    /* quota / private mode */
  }
}

/** Returns stored text once and removes it from sessionStorage. */
export function takeMealLogPrefill(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const v = sessionStorage.getItem(MEAL_LOG_PREFILL_KEY);
    if (v != null) sessionStorage.removeItem(MEAL_LOG_PREFILL_KEY);
    return v;
  } catch {
    return null;
  }
}

/** Dispatched on `window` when meal data changes (e.g. history edit/delete). */
export const MEALS_CHANGED_EVENT = "caloriepwa:meals-changed";

/** Cross-tab sync for open tabs (home + history). */
export const MEALS_BROADCAST_CHANNEL = "calorie-pwa-meals";

/**
 * Call after a successful client-side mutation that can affect “today” totals
 * (e.g. history delete/recalculate). Also updates other tabs via BroadcastChannel.
 */
export function notifyMealsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(MEALS_CHANGED_EVENT));
  try {
    const bc = new BroadcastChannel(MEALS_BROADCAST_CHANNEL);
    bc.postMessage({ type: "meals-changed" });
    bc.close();
  } catch {
    /* BroadcastChannel may be unavailable in some environments */
  }
}

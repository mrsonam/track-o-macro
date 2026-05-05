/** Ingest payload + DB `source` for Apple Shortcuts automation. */
export const HEALTH_SOURCE_APPLE_SHORTCUTS = "apple_health_shortcuts" as const;

/** Canonical metric keys (payload `type` aliases map into these). */
export const HEALTH_METRIC_TYPES = [
  "steps",
  "active_energy",
  "resting_energy",
  "weight",
  "body_fat",
  "workout",
  "exercise_minutes",
  "stand_hours",
  "distance",
  "sleep",
  "heart_rate",
] as const;

export type HealthMetricType = (typeof HEALTH_METRIC_TYPES)[number];

export function isHealthMetricType(s: string): s is HealthMetricType {
  return (HEALTH_METRIC_TYPES as readonly string[]).includes(s);
}

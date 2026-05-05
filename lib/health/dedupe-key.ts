import { createHash } from "crypto";
import type { HealthMetricType } from "@/lib/health/constants";

function stableValueKey(value: number): string {
  if (!Number.isFinite(value)) return "nan";
  return value.toFixed(6).replace(/\.?0+$/, "");
}

/**
 * Dedupe key for a normalized sample. Prefer externalId when present
 * (stable across retries with same Health object id).
 */
export function healthSampleDedupeKey(input: {
  userId: string;
  metricType: HealthMetricType;
  recordedAt: Date;
  value: number;
  unit: string;
  externalId?: string | null;
}): string {
  if (input.externalId && input.externalId.trim().length > 0) {
    const ext = input.externalId.trim().slice(0, 512);
    return `ext:v1:${input.userId}:${ext}`;
  }
  const ts = input.recordedAt.getTime();
  const v = stableValueKey(input.value);
  const u = input.unit.trim().toLowerCase();
  const raw = `fp:v1:${input.userId}:${input.metricType}:${ts}:${v}:${u}`;
  return createHash("sha256").update(raw).digest("hex");
}

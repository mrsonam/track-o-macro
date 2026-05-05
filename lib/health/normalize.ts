import {
  type HealthMetricType,
  isHealthMetricType,
} from "@/lib/health/constants";

const TYPE_ALIASES: Record<string, HealthMetricType> = {
  steps: "steps",
  step: "steps",
  step_count: "steps",
  stepcount: "steps",
  "step count": "steps",
  active_energy: "active_energy",
  activeenergy: "active_energy",
  active_energy_burned: "active_energy",
  "active energy": "active_energy",
  resting_energy: "resting_energy",
  restingenergy: "resting_energy",
  basal_energy: "resting_energy",
  weight: "weight",
  body_mass: "weight",
  bodymass: "weight",
  body_fat: "body_fat",
  bodyfat: "body_fat",
  "body fat": "body_fat",
  body_fat_percentage: "body_fat",
  workout: "workout",
  workouts: "workout",
  exercise_minutes: "exercise_minutes",
  exercise: "exercise_minutes",
  "exercise minutes": "exercise_minutes",
  apple_exercise_time: "exercise_minutes",
  stand_hours: "stand_hours",
  stand: "stand_hours",
  "stand hours": "stand_hours",
  apple_stand_time: "stand_hours",
  distance: "distance",
  walking_running_distance: "distance",
  sleep: "sleep",
  sleep_analysis: "sleep",
  heart_rate: "heart_rate",
  heartrate: "heart_rate",
  "heart rate": "heart_rate",
  resting_heart_rate: "heart_rate",
};

export function canonicalMetricType(raw: string): HealthMetricType | null {
  const k = raw.trim().toLowerCase().replace(/\s+/g, "_");
  if (isHealthMetricType(k)) return k;
  const mapped = TYPE_ALIASES[k];
  return mapped ?? null;
}

export type NormalizedHealthSample = {
  metricType: HealthMetricType;
  value: number;
  unit: string;
  recordedAt: Date;
};

type NormResult =
  | { ok: true; data: NormalizedHealthSample }
  | { ok: false; message: string };

function toKg(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "kg" || u === "kilogram" || u === "kilograms") {
    return { ok: true, data: { value, unit: "kg" } as NormalizedHealthSample };
  }
  if (
    u === "lb" ||
    u === "lbs" ||
    u === "pound" ||
    u === "pounds" ||
    u === "lbm"
  ) {
    return {
      ok: true,
      data: { value: value * 0.45359237, unit: "kg" } as NormalizedHealthSample,
    };
  }
  return { ok: false, message: `Unsupported weight unit: ${unitRaw}` };
}

function toKcal(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "kcal" || u === "cal" || u === "kilocalorie" || u === "kilocalories") {
    const kcal = u === "cal" ? value / 1000 : value;
    return { ok: true, data: { value: kcal, unit: "kcal" } as NormalizedHealthSample };
  }
  if (u === "kj" || u === "kilojoule" || u === "kilojoules") {
    return {
      ok: true,
      data: { value: value / 4.184, unit: "kcal" } as NormalizedHealthSample,
    };
  }
  return { ok: false, message: `Unsupported energy unit: ${unitRaw}` };
}

function toMeters(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "m" || u === "meter" || u === "meters" || u === "metre" || u === "metres") {
    return { ok: true, data: { value, unit: "m" } as NormalizedHealthSample };
  }
  if (u === "km" || u === "kilometer" || u === "kilometers") {
    return { ok: true, data: { value: value * 1000, unit: "m" } as NormalizedHealthSample };
  }
  if (u === "mi" || u === "mile" || u === "miles") {
    return { ok: true, data: { value: value * 1609.344, unit: "m" } as NormalizedHealthSample };
  }
  if (u === "ft" || u === "foot" || u === "feet") {
    return { ok: true, data: { value: value * 0.3048, unit: "m" } as NormalizedHealthSample };
  }
  return { ok: false, message: `Unsupported distance unit: ${unitRaw}` };
}

function toMinutes(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "min" || u === "minute" || u === "minutes" || u === "mins") {
    return { ok: true, data: { value, unit: "min" } as NormalizedHealthSample };
  }
  if (u === "h" || u === "hr" || u === "hour" || u === "hours") {
    return { ok: true, data: { value: value * 60, unit: "min" } as NormalizedHealthSample };
  }
  return { ok: false, message: `Unsupported duration unit: ${unitRaw}` };
}

function toPct(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "%" || u === "pct" || u === "percent" || u === "percentage") {
    return { ok: true, data: { value, unit: "%" } as NormalizedHealthSample };
  }
  return { ok: false, message: `Unsupported body fat unit: ${unitRaw}` };
}

function toBpm(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "bpm" || u === "count/min" || u === "/min") {
    return { ok: true, data: { value, unit: "bpm" } as NormalizedHealthSample };
  }
  return { ok: false, message: `Unsupported heart rate unit: ${unitRaw}` };
}

function toSteps(value: number): NormResult {
  return { ok: true, data: { value, unit: "count" } as NormalizedHealthSample };
}

/** Apple “Stand Hours” / similar: normalize to hour-equivalent for rollup. */
function toStandHours(value: number, unitRaw: string): NormResult {
  const u = unitRaw.trim().toLowerCase();
  if (u === "min" || u === "minute" || u === "minutes" || u === "mins") {
    return { ok: true, data: { value: value / 60, unit: "hr" } as NormalizedHealthSample };
  }
  return { ok: true, data: { value, unit: "hr" } as NormalizedHealthSample };
}

/**
 * Normalize raw Shortcut fields into canonical metric + value + unit.
 */
export function normalizeHealthSampleInput(input: {
  type: string;
  value: number;
  unit: string;
  recordedAt: Date;
}): NormResult {
  const metricType = canonicalMetricType(input.type);
  if (!metricType) {
    return { ok: false, message: `Unknown metric type: ${input.type}` };
  }
  if (!Number.isFinite(input.value)) {
    return { ok: false, message: "Value must be a finite number" };
  }

  let body: NormResult;
  switch (metricType) {
    case "weight":
      body = toKg(input.value, input.unit);
      break;
    case "body_fat":
      body = toPct(input.value, input.unit);
      break;
    case "active_energy":
    case "resting_energy":
      body = toKcal(input.value, input.unit);
      break;
    case "workout": {
      const wu = input.unit.trim().toLowerCase();
      const energyUnits = new Set([
        "kcal",
        "cal",
        "kj",
        "kilojoule",
        "kilojoules",
        "kilocalorie",
        "kilocalories",
      ]);
      body = energyUnits.has(wu)
        ? toKcal(input.value, input.unit)
        : toMinutes(input.value, input.unit);
      break;
    }
    case "exercise_minutes":
    case "sleep":
      body = toMinutes(input.value, input.unit);
      break;
    case "stand_hours":
      body = toStandHours(input.value, input.unit);
      break;
    case "distance":
      body = toMeters(input.value, input.unit);
      break;
    case "heart_rate":
      body = toBpm(input.value, input.unit);
      break;
    case "steps":
      body = toSteps(input.value);
      break;
  }

  if (!body.ok) return body;
  return {
    ok: true,
    data: {
      metricType,
      value: body.data.value,
      unit: body.data.unit,
      recordedAt: input.recordedAt,
    },
  };
}

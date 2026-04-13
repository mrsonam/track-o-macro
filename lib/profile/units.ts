/**
 * Global Unit System Utilities
 *
 * Source of truth in the database is ALWAYS Metric (kg, cm, grams).
 * This module handle safe round-tripping for Imperial users.
 */

export type UnitSystem = "metric" | "imperial";

// Constants
export const LBS_PER_KG = 2.20462;
export const CM_PER_INCH = 2.54;

/**
 * Height conversions
 */
export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/**
 * Weight conversions
 */
export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

/**
 * Formatter for Weight (with precision)
 */
export function formatWeight(valKg: number, system: UnitSystem): string {
  if (system === "imperial") {
    const lbs = kgToLbs(valKg);
    return `${lbs.toFixed(1)} lbs`;
  }
  return `${valKg.toFixed(1)} kg`;
}

/**
 * Formatter for Height
 */
export function formatHeight(valCm: number, system: UnitSystem): string {
  if (system === "imperial") {
    const inches = cmToInches(valCm);
    return `${Math.round(inches)}"`;
  }
  return `${Math.round(valCm)} cm`;
}

/**
 * Label helpers
 */
export function getWeightLabel(system: UnitSystem): string {
  return system === "imperial" ? "lbs" : "kg";
}

export function getHeightLabel(system: UnitSystem): string {
  return system === "imperial" ? "inches" : "cm";
}

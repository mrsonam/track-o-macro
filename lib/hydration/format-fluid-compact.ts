import type { UnitSystem } from "@/lib/profile/units";

export function formatFluidCompact(ml: number, unit: UnitSystem): string {
  if (!Number.isFinite(ml) || ml < 0) return "0";
  const rounded = Math.round(ml);
  if (rounded === 0) return "0";
  if (unit === "imperial") {
    const flOz = ml / 29.5735;
    if (flOz >= 128) return `${(flOz / 128).toFixed(1)} gal`;
    return `${Math.round(flOz)} oz`;
  }
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)} L`;
  return `${rounded} ml`;
}

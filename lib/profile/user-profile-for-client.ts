import type { UserProfile } from "@prisma/client";

/**
 * Prisma `Decimal` (and `Date`) instances are not serializable across the
 * Server → Client Component boundary. Convert numeric decimals to `number`
 * so props are plain JSON.
 */
export function userProfileForClient(p: UserProfile | null): UserProfile | null {
  if (!p) return null;
  return {
    ...p,
    heightCm: p.heightCm != null ? Number(p.heightCm) : null,
    weightKg: p.weightKg != null ? Number(p.weightKg) : null,
    targetProteinG: p.targetProteinG != null ? Number(p.targetProteinG) : null,
    goalWeightKg: p.goalWeightKg != null ? Number(p.goalWeightKg) : null,
    bmrKcal: p.bmrKcal != null ? Number(p.bmrKcal) : null,
    tdeeKcal: p.tdeeKcal != null ? Number(p.tdeeKcal) : null,
    targetKcal: p.targetKcal != null ? Number(p.targetKcal) : null,
  } as UserProfile;
}

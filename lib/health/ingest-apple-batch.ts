import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { HEALTH_SOURCE_APPLE_SHORTCUTS } from "@/lib/health/constants";
import { healthSampleDedupeKey } from "@/lib/health/dedupe-key";
import { normalizeHealthSampleInput } from "@/lib/health/normalize";
import type { AppleHealthSyncBody } from "@/lib/health/apple-sync-schema";

export type IngestAppleBatchResult = {
  success: boolean;
  ingested: number;
  duplicates: number;
  errors: Array<{ index: number; message: string }>;
};

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

function readBodyFatFromMetadata(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  const raw = (metadata as Record<string, unknown>).bodyFatPct;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return raw;
}

export async function ingestAppleHealthBatch(
  userId: string,
  body: AppleHealthSyncBody,
): Promise<IngestAppleBatchResult> {
  const errors: Array<{ index: number; message: string }> = [];
  let ingested = 0;
  let duplicates = 0;

  if (body.samples.length === 0) {
    return { success: true, ingested: 0, duplicates: 0, errors: [] };
  }

  for (let i = 0; i < body.samples.length; i++) {
    const row = body.samples[i]!;
    const recordedAt = new Date(row.recordedAt);
    if (Number.isNaN(recordedAt.getTime())) {
      errors.push({ index: i, message: "Invalid recordedAt" });
      continue;
    }

    const norm = normalizeHealthSampleInput({
      type: row.type,
      value: row.value,
      unit: row.unit,
      recordedAt,
    });
    if (!norm.ok) {
      errors.push({ index: i, message: norm.message });
      continue;
    }

    const dedupeKey = healthSampleDedupeKey({
      userId,
      metricType: norm.data.metricType,
      recordedAt: norm.data.recordedAt,
      value: norm.data.value,
      unit: norm.data.unit,
      externalId: row.externalId,
    });

    const rawPayload = {
      type: row.type,
      value: row.value,
      unit: row.unit,
      recordedAt: row.recordedAt,
      externalId: row.externalId ?? null,
      metadata: row.metadata ?? null,
    };

    try {
      await prisma.healthSample.create({
        data: {
          userId,
          metricType: norm.data.metricType,
          value: new Prisma.Decimal(norm.data.value),
          unit: norm.data.unit,
          recordedAt: norm.data.recordedAt,
          source: HEALTH_SOURCE_APPLE_SHORTCUTS,
          externalId: row.externalId?.trim() || null,
          metadata:
            row.metadata === undefined
              ? undefined
              : row.metadata === null
                ? Prisma.JsonNull
                : (row.metadata as Prisma.InputJsonValue),
          dedupeKey,
          rawPayload: rawPayload as Prisma.InputJsonValue,
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) {
        duplicates += 1;
        continue;
      }
      errors.push({ index: i, message: "Database error saving sample" });
      continue;
    }

    ingested += 1;

    if (norm.data.metricType === "weight") {
      const kg = norm.data.value;
      if (kg < 15 || kg > 700) {
        continue;
      }
      const fromMeta = readBodyFatFromMetadata(row.metadata);
      const bodyFat =
        fromMeta != null && fromMeta >= 1 && fromMeta <= 80 ? fromMeta : null;

      try {
        await prisma.weightLog.create({
          data: {
            userId,
            weightKg: new Prisma.Decimal(kg),
            bodyFatPct:
              bodyFat != null ? new Prisma.Decimal(bodyFat) : null,
            loggedAt: norm.data.recordedAt,
            ingestSource: HEALTH_SOURCE_APPLE_SHORTCUTS,
            ingestDedupeKey: dedupeKey,
          },
        });
        try {
          await prisma.userProfile.update({
            where: { userId },
            data: { weightKg: new Prisma.Decimal(kg) },
          });
        } catch {
          /* profile may not exist yet */
        }
      } catch (e) {
        if (!isUniqueViolation(e)) {
          errors.push({
            index: i,
            message: "Could not mirror weight to weight log",
          });
        }
      }
    }
  }

  return {
    success: errors.length === 0,
    ingested,
    duplicates,
    errors,
  };
}

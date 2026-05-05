import { z } from "zod";
import { HEALTH_SOURCE_APPLE_SHORTCUTS } from "@/lib/health/constants";

const metadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
  .optional()
  .nullable();

export const appleHealthSampleInputSchema = z.object({
  type: z.string().min(1).max(80),
  value: z.coerce.number(),
  unit: z.string().min(1).max(60),
  recordedAt: z.string().datetime(),
  externalId: z.union([z.string().max(512), z.null()]).optional(),
  metadata: metadataSchema,
});

export const appleHealthSyncBodySchema = z.object({
  source: z.literal(HEALTH_SOURCE_APPLE_SHORTCUTS),
  device: z.string().max(80).optional().nullable(),
  sentAt: z.string().datetime(),
  /** Empty array is accepted (Shortcuts may send no new rows). */
  samples: z.array(appleHealthSampleInputSchema).max(200),
});

export type AppleHealthSyncBody = z.infer<typeof appleHealthSyncBodySchema>;

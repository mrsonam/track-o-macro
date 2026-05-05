import { prisma } from "@/lib/prisma";
import {
  rollupAppleHealthSamplesInRange,
  type AppleHealthDayRollup,
} from "@/lib/health/apple-day-rollup";

type Range = { fromD: Date; toD: Date };

export async function loadAppleHealthRollupsForRanges(
  userId: string,
  ranges: Range[],
): Promise<AppleHealthDayRollup[]> {
  if (ranges.length === 0) return [];

  const minT = Math.min(...ranges.map((r) => r.fromD.getTime()));
  const maxT = Math.max(...ranges.map((r) => r.toD.getTime()));

  const rows = await prisma.healthSample.findMany({
    where: {
      userId,
      recordedAt: { gte: new Date(minT), lt: new Date(maxT) },
    },
    select: {
      metricType: true,
      value: true,
      unit: true,
      recordedAt: true,
    },
  });

  return ranges.map((range) =>
    rollupAppleHealthSamplesInRange(rows, range.fromD, range.toD),
  );
}

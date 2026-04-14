import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import {
  calculateMetabolicAdaptation,
  type MetabolicDataPoint,
} from "@/lib/intelligence/metabolic-engine";

/** UTC calendar day `YYYY-MM-DD` — matches `createdAt.toISOString().slice(0, 10)` bucketing. */
function utcDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const daysToLookBack = 14;
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - daysToLookBack);

    // 1. Fetch data
    const [meals, weightLogs, profile] = await Promise.all([
      prisma.meal.findMany({
        where: {
          userId: session.user.id,
          createdAt: { gte: startDate }
        },
        select: {
          totalKcal: true,
          createdAt: true
        }
      }),
      prisma.weightLog.findMany({
        where: {
          userId: session.user.id,
          loggedAt: { gte: startDate }
        },
        orderBy: { loggedAt: "asc" },
        select: {
          weightKg: true,
          loggedAt: true
        }
      }),
      prisma.userProfile.findUnique({
        where: { userId: session.user.id },
        select: { 
          targetKcal: true,
          goalIntent: true,
          goalPace: true
        }
      })
    ]);

    // 2. Aggregate into Data Points by Day (UTC dates — aligned with meal / weight timestamps)
    const dataMap = new Map<string, MetabolicDataPoint>();

    for (let i = 0; i < daysToLookBack; i++) {
      const d = new Date();
      d.setUTCHours(0, 0, 0, 0);
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = utcDateKey(d);
      dataMap.set(dateStr, { date: dateStr, kcal: 0 });
    }

    // Add meals
    meals.forEach((meal) => {
      const dateStr = utcDateKey(meal.createdAt);
      if (dataMap.has(dateStr)) {
        const point = dataMap.get(dateStr)!;
        const k = Number(meal.totalKcal);
        point.kcal += Number.isFinite(k) ? Math.max(0, k) : 0;
      }
    });

    // Add weights (use the latest weight of the day if multiple)
    weightLogs.forEach((log) => {
      const dateStr = utcDateKey(log.loggedAt);
      if (dataMap.has(dateStr)) {
        dataMap.get(dateStr)!.weightKg = Number(log.weightKg);
      }
    });

    const dataPoints = Array.from(dataMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // 3. Compute Intelligence
    const insight = calculateMetabolicAdaptation(dataPoints);

    return NextResponse.json({
      ...insight,
      currentTargetKcal: profile?.targetKcal ? Number(profile.targetKcal) : null,
      goalIntent: profile?.goalIntent,
      goalPace: profile?.goalPace
    });

  } catch (error) {
    console.error("Metabolic API error:", error);
    return NextResponse.json({ error: "Failed to compute metabolic intelligence" }, { status: 500 });
  }
}

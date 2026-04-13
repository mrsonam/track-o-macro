import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { calculateMetabolicAdaptation, MetabolicDataPoint } from "@/lib/intelligence/metabolic-engine";
import { startOfDay, subDays } from "date-fns";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const daysToLookBack = 14;
    const startDate = startOfDay(subDays(new Date(), daysToLookBack));

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

    // 2. Aggregate into Data Points by Day
    const dataMap = new Map<string, MetabolicDataPoint>();
    
    // Initialize days
    for (let i = 0; i < daysToLookBack; i++) {
       const dateStr = startOfDay(subDays(new Date(), i)).toISOString().split('T')[0];
       dataMap.set(dateStr, { date: dateStr, kcal: 0 });
    }

    // Add meals
    meals.forEach(meal => {
      const dateStr = meal.createdAt.toISOString().split('T')[0];
      if (dataMap.has(dateStr)) {
        const point = dataMap.get(dateStr)!;
        point.kcal += Number(meal.totalKcal);
      }
    });

    // Add weights (use the latest weight of the day if multiple)
    weightLogs.forEach(log => {
      const dateStr = log.loggedAt.toISOString().split('T')[0];
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

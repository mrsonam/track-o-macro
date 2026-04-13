import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

const logWeightSchema = z.object({
  weightKg: z.number().min(10).max(600),
  bodyFatPct: z.number().min(1).max(80).optional().nullable(),
  loggedAt: z.string().datetime().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch last 30 logs for history
  const logs = await prisma.weightLog.findMany({
    where: { userId: session.user.id },
    orderBy: { loggedAt: "desc" },
    take: 30,
  });

  return NextResponse.json({ logs });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = logWeightSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { weightKg, bodyFatPct, loggedAt } = parsed.data;

  // Create the log
  try {
    const log = await prisma.weightLog.create({
      data: {
        userId: session.user.id,
        weightKg: new Prisma.Decimal(weightKg),
        bodyFatPct: bodyFatPct != null ? new Prisma.Decimal(bodyFatPct) : null,
        loggedAt: loggedAt ? new Date(loggedAt) : new Date(),
      },
    });

    // Also update the snapshot in the profile for TDEE calculations
    // We use try-catch here because if the profile hasn't been created yet (pre-onboarding),
    // we still want the weight log to be successful.
    try {
      await prisma.userProfile.update({
        where: { userId: session.user.id },
        data: {
          weightKg: new Prisma.Decimal(weightKg),
        },
      });
    } catch (profileError) {
      console.warn("Could not update user profile weight snapshot (likely missing profile):", profileError);
    }

    return NextResponse.json({ log });
  } catch (dbError) {
    console.error("Database error creating weight log:", dbError);
    return NextResponse.json({ error: "Database failure" }, { status: 500 });
  }
}

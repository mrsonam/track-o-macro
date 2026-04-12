import { prisma } from "@/lib/prisma";

export async function isOnboardingComplete(userId: string): Promise<boolean> {
  const profile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { onboardingCompletedAt: true },
  });
  return Boolean(profile?.onboardingCompletedAt);
}

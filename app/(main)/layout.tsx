import { redirect } from "next/navigation";
import { AppHeader } from "../components/app-header";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login");
  }

  let profile: { onboardingCompletedAt: Date | null } | null;
  try {
    profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
      select: { onboardingCompletedAt: true },
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  if (!profile?.onboardingCompletedAt) {
    redirect("/onboarding");
  }

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-xl focus:border focus:border-emerald-200 focus:bg-white focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-emerald-950 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        Skip to content
      </a>
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex min-h-0 flex-1 flex-col outline-none"
      >
        {children}
      </main>
    </>
  );
}

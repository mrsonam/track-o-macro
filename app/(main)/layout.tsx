import { redirect } from "next/navigation";
import { AppHeader } from "../components/app-header";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { isDbUnavailableError } from "@/lib/db-errors";
import { FloatingNav } from "../components/floating-nav";


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
    <div className="fresh-shell flex min-h-dvh flex-col overflow-x-hidden">
      <AppHeader />
      <main
        id="main-content"
        tabIndex={-1}
        className="relative flex min-h-0 flex-1 flex-col pb-32 outline-none"
      >
        {children}
      </main>
      <FloatingNav />
    </div>
  );
}

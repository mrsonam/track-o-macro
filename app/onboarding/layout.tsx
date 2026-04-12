import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/onboarding");
  }

  return <>{children}</>;
}

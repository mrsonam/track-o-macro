import { redirect } from "next/navigation";
import { LandingPage } from "@/app/components/landing/landing-page";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (session?.user?.id) {
    redirect("/dashboard");
  }
  return <LandingPage />;
}

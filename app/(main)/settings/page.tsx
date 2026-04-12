import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SettingsForm } from "@/app/components/settings-form";
import { UserFoodsManager } from "@/app/components/user-foods-manager";
import { AccountDataPanel } from "@/app/components/account-data-panel";
import { isDbUnavailableError } from "@/lib/db-errors";
import { userProfileForClient } from "@/lib/profile/user-profile-for-client";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    redirect("/login?next=/settings");
  }

  let profile;
  try {
    profile = await prisma.userProfile.findUnique({
      where: { userId: session.user.id },
    });
  } catch (e) {
    if (isDbUnavailableError(e)) {
      redirect("/error/database");
    }
    throw e;
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 pb-12 pt-8 sm:px-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-800/90">
        Account
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
        Settings
      </h1>
      <p className="mt-2 max-w-lg text-sm leading-relaxed text-stone-600">
        Update your measurements and goal. We&apos;ll recalculate your daily
        calorie target using the same formulas as onboarding.
      </p>
      <p className="mt-2 text-sm">
        <Link
          href="/"
          className="font-medium text-emerald-800 underline decoration-emerald-800/30 underline-offset-2 hover:decoration-emerald-800"
        >
          ← Back to logging
        </Link>
      </p>
      <SettingsForm profile={userProfileForClient(profile)} />
      <UserFoodsManager />
      <AccountDataPanel />
    </div>
  );
}

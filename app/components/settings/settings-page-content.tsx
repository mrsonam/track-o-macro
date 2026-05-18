import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Activity, User } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SettingsForm } from "@/app/components/settings-form";
import { AppleHealthSyncPanel } from "@/app/components/apple-health-sync-panel";
import { isDbUnavailableError } from "@/lib/db-errors";
import { userProfileForClient } from "@/lib/profile/user-profile-for-client";
import { TrendsSectionHeading } from "@/app/components/trends/trends-section-heading";

export async function SettingsPageContent() {
  await connection();
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
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start lg:gap-8 xl:gap-10">
      <section
        className="min-w-0 lg:col-span-8"
        aria-labelledby="settings-profile-heading"
      >
        <TrendsSectionHeading
          id="settings-profile-heading"
          title="Profile & goals"
          description="Identity, units, objectives, and calculation inputs."
          icon={User}
          accent="signal"
        />
        <SettingsForm
          key={
            profile
              ? `${profile.userId}-${profile.updatedAt.toISOString()}`
              : "no-profile"
          }
          profile={userProfileForClient(profile)}
        />
      </section>

      <section
        className="min-w-0 lg:col-span-4"
        aria-labelledby="settings-automation-heading"
      >
        <TrendsSectionHeading
          id="settings-automation-heading"
          title="Automation"
          description="Apple Health intake sync and Shortcut tokens."
          icon={Activity}
          accent="neutral"
        />
        <div className="lg:sticky lg:top-20">
          <AppleHealthSyncPanel />
        </div>
      </section>
    </div>
  );
}

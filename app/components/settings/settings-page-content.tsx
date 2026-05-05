import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SettingsForm } from "@/app/components/settings-form";
import { AppleHealthSyncPanel } from "@/app/components/apple-health-sync-panel";
import { isDbUnavailableError } from "@/lib/db-errors";
import { userProfileForClient } from "@/lib/profile/user-profile-for-client";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";

function SectionHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">
          Settings Block
        </p>
        <h2 className="mt-1 text-xl font-black tracking-tight text-zinc-950">{title}</h2>
      </div>
      <p className="max-w-md text-right text-xs font-medium text-zinc-600">{subtitle}</p>
    </div>
  );
}

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
    <div className="space-y-12">
      <section>
        <SectionHeader
          title="Profile & Goals"
          subtitle="Identity, units, objective, and calculation inputs."
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

      <section>
        <SectionHeader
          title="Automation"
          subtitle="Configure Apple Health intake sync and import behavior."
        />
        <AppleHealthSyncPanel />
      </section>
    </div>
  );
}

export function SettingsPageHeader() {
  return (
    <header className="mb-12">
      <Link
        href="/"
        className="group mb-8 flex w-fit items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-600 transition-colors hover:text-[#4f9d45]"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Return to Dashboard
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#4f9d45]/20 bg-[#eaf7df] text-[#4f9d45]">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-zinc-950">
            System Settings
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-600">
            Configure your profile, targets, coaching logic, and automation in one place.
          </p>
        </div>
      </div>
    </header>
  );
}

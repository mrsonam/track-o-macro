import { redirect } from "next/navigation";
import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { SettingsForm } from "@/app/components/settings-form";
import { UserFoodsManager } from "@/app/components/user-foods-manager";
import { AccountDataPanel } from "@/app/components/account-data-panel";
import { isDbUnavailableError } from "@/lib/db-errors";
import { userProfileForClient } from "@/lib/profile/user-profile-for-client";
import { ChevronLeft, Settings as SettingsIcon } from "lucide-react";

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
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Profile & Goals</h2>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>
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
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Library Manager</h2>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>
        <UserFoodsManager />
      </section>

      <section>
        <div className="mb-6 flex items-center gap-4">
          <h2 className="text-xl font-bold text-white">Biological Identity</h2>
          <div className="h-[1px] flex-1 bg-white/5" />
        </div>
        <AccountDataPanel />
      </section>
    </div>
  );
}

export function SettingsPageHeader() {
  return (
    <header className="mb-12">
      <Link
        href="/"
        className="group mb-8 flex w-fit items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-500 transition-colors hover:text-emerald-500"
      >
        <ChevronLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Return to Dashboard
      </Link>

      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
          <SettingsIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white">
            System Settings
          </h1>
          <p className="mt-2 text-sm font-medium text-zinc-500">
            Configure your biological profile and performance targets.
          </p>
        </div>
      </div>
    </header>
  );
}

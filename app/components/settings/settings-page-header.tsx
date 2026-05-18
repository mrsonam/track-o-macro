"use client";

import { PageHeaderReveal } from "@/app/components/motion/page-header-reveal";
import { dash } from "@/lib/ui/dashboard-tokens";

export function SettingsPageHeader() {
  return (
    <PageHeaderReveal className="mb-8 flex flex-col gap-4 lg:mb-10">
      <div className="min-w-0">
        <p className={dash.labelEyebrow}>Account</p>
        <h1 className="font-mono text-3xl font-black tracking-tight text-foreground sm:text-4xl">
          Settings
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-[17px]">
          Profile, targets, coaching preferences, and Apple Health automation in one place.
        </p>
      </div>
    </PageHeaderReveal>
  );
}

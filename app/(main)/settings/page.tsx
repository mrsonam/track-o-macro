import { Suspense } from "react";
import {
  SettingsPageContent,
  SettingsPageHeader,
} from "@/app/components/settings/settings-page-content";
import { SettingsPageSkeleton } from "@/app/components/skeletons/settings-page-skeleton";

export default function SettingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 px-4 pb-32 pt-12 sm:px-6">
      <div className="w-full">
        <SettingsPageHeader />

        <Suspense fallback={<SettingsPageSkeleton />}>
          <SettingsPageContent />
        </Suspense>

        <p className="mt-20 text-center text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-800">
          End of Configuration • Protocol v1.0
        </p>
      </div>
    </div>
  );
}

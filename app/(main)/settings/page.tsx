import { Suspense } from "react";
import { SettingsPageContent } from "@/app/components/settings/settings-page-content";
import { SettingsPageHeader } from "@/app/components/settings/settings-page-header";
import { SettingsPageSkeleton } from "@/app/components/skeletons/settings-page-skeleton";

export default function SettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SettingsPageHeader />

      <Suspense fallback={<SettingsPageSkeleton />}>
        <SettingsPageContent />
      </Suspense>
    </div>
  );
}

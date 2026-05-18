import { Suspense } from "react";
import { HomeMealLogSection } from "@/app/components/home/home-meal-log-section";
import { HomeDashboardSkeleton } from "@/app/components/skeletons/home-dashboard-skeleton";

export default function DashboardPage() {
  return (
    <Suspense fallback={<HomeDashboardSkeleton />}>
      <HomeMealLogSection />
    </Suspense>
  );
}

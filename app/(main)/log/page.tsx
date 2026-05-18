import { Suspense } from "react";
import { LogMealLogSection } from "@/app/components/log/log-meal-log-section";
import { MainRouteSkeleton } from "@/app/components/skeletons/main-route-skeleton";

type LogPageProps = {
  searchParams: Promise<{ date?: string }>;
};

export default async function LogPage({ searchParams }: LogPageProps) {
  const { date } = await searchParams;

  return (
    <Suspense fallback={<MainRouteSkeleton />}>
      <LogMealLogSection logDateKey={date} />
    </Suspense>
  );
}

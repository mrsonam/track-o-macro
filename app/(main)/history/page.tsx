import { Suspense } from "react";
import { HistoryMealsSection } from "@/app/components/history/history-meals-section";
import { HistoryPageSkeleton } from "@/app/components/skeletons/history-page-skeleton";

export default function HistoryPage() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
          History
        </h1>
        <p className="mt-2 max-w-lg text-sm text-zinc-500">
          Newest first. Filter by text or date range, export CSV, and log again,
          edit, or delete each entry.
        </p>
      </header>

      <Suspense fallback={<HistoryPageSkeleton />}>
        <HistoryMealsSection />
      </Suspense>
    </>
  );
}

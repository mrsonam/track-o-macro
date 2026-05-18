/** CLS-safe placeholders matching the Today dashboard shell (fixed heights). */
export function HomeDashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-6 sm:px-6">
      <div className="mb-8 flex flex-col gap-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-3 w-24 animate-pulse rounded bg-black/10" />
            <div className="h-9 w-36 animate-pulse rounded-lg bg-black/10" />
            <div className="h-4 w-44 animate-pulse rounded bg-black/10" />
          </div>
          <div className="h-11 w-32 shrink-0 animate-pulse rounded-2xl bg-black/10" />
        </div>

        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded bg-black/10" />
          <div className="flex gap-2 overflow-hidden pb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-24 min-w-[4.5rem] shrink-0 animate-pulse rounded-2xl bg-white/80"
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 lg:col-span-8">
            <div className="rounded-3xl border border-black/[0.08] bg-white/80 p-6">
              <div className="mb-4 h-4 w-40 animate-pulse rounded bg-black/10" />
              <div className="h-28 animate-pulse rounded-2xl bg-black/10" />
            </div>
            <div className="h-24 animate-pulse rounded-3xl border border-sky-500/15 bg-[#dff1ff]/40" />
            <div className="h-40 animate-pulse rounded-3xl border border-black/[0.08] bg-white/80" />
          </div>
          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="h-40 animate-pulse rounded-3xl bg-[#f7f3e9]" />
            <div className="h-64 animate-pulse rounded-3xl bg-[#dff1ff]" />
            <div className="h-36 animate-pulse rounded-3xl bg-[#eaf7df]" />
          </div>
        </div>
      </div>
    </div>
  );
}

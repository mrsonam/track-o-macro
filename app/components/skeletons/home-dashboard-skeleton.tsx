/** CLS-safe placeholders matching the home dashboard shell (fixed heights). */
export function HomeDashboardSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-8 flex flex-col gap-6">
        <div className="rounded-3xl border border-white/[0.06] bg-zinc-950/40 p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 shrink-0 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="space-y-2">
              <div className="h-5 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-48 animate-pulse rounded bg-zinc-800/80" />
            </div>
          </div>
          <div className="h-[120px] w-full animate-pulse rounded-3xl bg-zinc-900/80" />
          <div className="mt-4 flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="h-9 w-24 animate-pulse rounded-2xl bg-zinc-800" />
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="space-y-3">
          <div className="h-3 w-28 animate-pulse rounded bg-zinc-800" />
          <div className="flex gap-2 overflow-hidden pb-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="h-24 min-w-[4.5rem] shrink-0 animate-pulse rounded-2xl bg-zinc-900/80"
              />
            ))}
          </div>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-white/5 to-transparent" />

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          <div className="space-y-8 lg:col-span-8">
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-950/30 p-6">
              <div className="mb-4 h-4 w-40 animate-pulse rounded bg-zinc-800" />
              <div className="h-28 animate-pulse rounded-2xl bg-zinc-900/70" />
            </div>
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-950/30 p-6">
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="mt-4 h-16 animate-pulse rounded-2xl bg-zinc-900/70" />
            </div>
          </div>
          <div className="space-y-6 lg:col-span-4">
            <div className="h-40 animate-pulse rounded-3xl bg-zinc-900/60" />
            <div className="h-36 animate-pulse rounded-3xl bg-zinc-900/60" />
            <div className="h-64 animate-pulse rounded-3xl bg-zinc-900/60" />
          </div>
        </div>
      </div>
    </div>
  );
}

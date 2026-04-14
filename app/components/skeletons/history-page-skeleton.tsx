export function HistoryPageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-3xl border border-white/[0.05] bg-zinc-950/50 p-6 glass-pane">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="h-12 flex-1 animate-pulse rounded-2xl bg-zinc-900/80" />
          <div className="flex gap-3">
            <div className="h-12 w-36 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="h-12 w-20 animate-pulse rounded-2xl bg-zinc-800" />
            <div className="h-12 w-32 animate-pulse rounded-2xl bg-zinc-800" />
          </div>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-white/[0.05] pt-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-11 animate-pulse rounded-xl bg-zinc-900/70" />
          <div className="h-11 animate-pulse rounded-xl bg-zinc-900/70" />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-36 animate-pulse rounded-3xl border border-white/[0.05] bg-zinc-900/40 p-6"
          >
            <div className="mb-4 h-3 w-24 animate-pulse rounded bg-zinc-800" />
            <div className="h-4 w-full max-w-md animate-pulse rounded bg-zinc-800/80" />
          </div>
        ))}
      </div>
    </div>
  );
}

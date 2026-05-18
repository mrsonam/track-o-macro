export function MonthHistorySkeleton() {
  return (
    <div className="space-y-8 motion-safe:animate-pulse" aria-hidden>
      <div className="flex flex-col gap-4 border-b border-black/10 pb-6 sm:flex-row sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-warm-neutral" />
          <div className="space-y-2">
            <div className="h-2.5 w-16 rounded bg-zinc-200" />
            <div className="h-6 w-36 rounded bg-zinc-200" />
          </div>
        </div>
        <div className="h-11 w-full rounded-xl bg-zinc-200 sm:w-48" />
      </div>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-warm-neutral" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-40 rounded-2xl bg-warm-neutral/80" />
        <div className="h-40 rounded-2xl bg-warm-neutral/80" />
      </div>
      <div className="mt-8 h-52 rounded-2xl bg-warm-neutral/80" />
    </div>
  );
}

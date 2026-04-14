export function TrendsPageSkeleton() {
  return (
    <div className="flex min-h-[50vh] flex-col gap-10 pb-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end">
        <div className="h-14 w-14 shrink-0 animate-pulse rounded-2xl bg-zinc-800" />
        <div className="min-w-0 flex-1 space-y-3">
          <div className="h-3 w-40 animate-pulse rounded bg-zinc-800" />
          <div className="h-9 w-64 max-w-full animate-pulse rounded bg-zinc-800" />
          <div className="h-4 w-full max-w-2xl animate-pulse rounded bg-zinc-800/70" />
        </div>
      </div>
      <div className="h-24 animate-pulse rounded-3xl bg-zinc-900/50" />
      <div className="h-72 animate-pulse rounded-3xl border border-white/[0.05] bg-zinc-900/40" />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-900/40 lg:col-span-7" />
        <div className="h-64 animate-pulse rounded-3xl bg-zinc-900/40 lg:col-span-5" />
      </div>
    </div>
  );
}

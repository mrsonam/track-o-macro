export function TrendsPageSkeleton() {
  return (
    <div className="flex min-h-[50vh] flex-col gap-12">
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 shrink-0 rounded-full border border-black/10 bg-white motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="rounded-3xl border border-black/10 bg-white p-6 motion-safe:animate-pulse sm:p-8">
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="h-14 rounded-xl bg-warm-neutral" />
          <div className="h-14 rounded-xl bg-warm-neutral" />
          <div className="h-14 rounded-xl bg-warm-neutral" />
        </div>
        <div className="h-6 w-48 rounded bg-zinc-200" />
        <div className="mt-3 h-4 w-full max-w-md rounded bg-zinc-200/80" />
      </div>
      <div className="h-80 rounded-3xl border border-black/10 bg-white/80 motion-safe:animate-pulse" />
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="h-64 rounded-3xl border border-black/10 bg-white/80 motion-safe:animate-pulse lg:col-span-7" />
        <div className="h-64 rounded-3xl border border-black/10 bg-white/80 motion-safe:animate-pulse lg:col-span-5" />
      </div>
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div
      className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-10"
      aria-hidden
    >
      <section className="space-y-6 lg:col-span-8">
        <div className="h-14 w-64 max-w-full motion-safe:animate-pulse rounded-lg bg-black/10" />
        <div className="space-y-4 rounded-3xl border border-black/10 bg-white/85 p-6 sm:p-8">
          <div className="h-10 w-full motion-safe:animate-pulse rounded-xl bg-warm-neutral" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            <div className="h-10 motion-safe:animate-pulse rounded-xl bg-warm-neutral" />
            <div className="h-10 motion-safe:animate-pulse rounded-xl bg-warm-neutral" />
            <div className="h-10 motion-safe:animate-pulse rounded-xl bg-warm-neutral" />
          </div>
          <div className="h-24 w-full motion-safe:animate-pulse rounded-xl bg-warm-neutral" />
        </div>
        <div className="h-48 motion-safe:animate-pulse rounded-3xl border border-black/10 bg-white/80" />
      </section>
      <section className="lg:col-span-4">
        <div className="mb-5 h-12 motion-safe:animate-pulse rounded-lg bg-black/10" />
        <div className="h-72 motion-safe:animate-pulse rounded-3xl border border-black/10 bg-white/80" />
      </section>
    </div>
  );
}

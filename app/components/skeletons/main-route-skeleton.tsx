/** Generic (main) layout placeholder for route transitions — light theme to match product shell. */
export function MainRouteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-8 h-8 w-48 max-w-full animate-pulse rounded-lg bg-black/10" />
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl border border-black/[0.08] bg-white/80" />
        <div className="h-56 animate-pulse rounded-3xl border border-black/[0.08] bg-white/80" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-3xl border border-black/[0.08] bg-white/80 lg:col-span-8" />
          <div className="h-72 animate-pulse rounded-3xl border border-black/[0.08] bg-white/80 lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}

/** Generic (main) layout placeholder for route transitions — avoids home-specific chrome on other pages. */
export function MainRouteSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 pb-24 pt-8 sm:px-6">
      <div className="mb-8 h-8 w-48 max-w-full animate-pulse rounded-lg bg-zinc-800" />
      <div className="space-y-6">
        <div className="h-40 animate-pulse rounded-3xl bg-zinc-900/50" />
        <div className="h-56 animate-pulse rounded-3xl bg-zinc-900/40" />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-3xl bg-zinc-900/40 lg:col-span-8" />
          <div className="h-72 animate-pulse rounded-3xl bg-zinc-900/40 lg:col-span-4" />
        </div>
      </div>
    </div>
  );
}

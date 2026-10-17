export default function TodayLoading() {
  return (
    <div className="min-h-screen bg-[#f5f0e6] px-6 py-8" aria-label="Loading today’s edition">
      <div className="mx-auto max-w-[1340px]">
        <div className="mb-10 h-8 w-40 animate-pulse rounded-sm bg-[#e8e2d5]" />
        <div className="mx-auto mb-8 h-16 w-48 animate-pulse rounded-sm bg-[#e8e2d5]" />
        <div className="mb-8 h-36 animate-pulse rounded-sm bg-[#eee8dc]" />
        <div className="grid gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-8">
            <div className="h-10 w-4/5 animate-pulse rounded-sm bg-[#e8e2d5]" />
            <div className="aspect-video animate-pulse rounded-sm bg-[#eee8dc]" />
            <div className="h-24 animate-pulse rounded-sm bg-[#e8e2d5]" />
          </div>
          <div className="space-y-3 lg:col-span-4">
            <div className="h-28 animate-pulse rounded-sm bg-[#eee8dc]" />
            <div className="h-28 animate-pulse rounded-sm bg-[#eee8dc]" />
            <div className="h-28 animate-pulse rounded-sm bg-[#eee8dc]" />
          </div>
        </div>
      </div>
    </div>
  );
}

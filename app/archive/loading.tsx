export default function ArchiveLoading() {
  return (
    <div className="min-h-screen bg-[#f5f0e6] px-6 py-8" aria-label="Loading archive">
      <div className="mx-auto max-w-[1100px]">
        <div className="mb-8 h-12 w-56 animate-pulse rounded-sm bg-[#e8e2d5]" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-sm bg-[#eee8dc]" />
          ))}
        </div>
      </div>
    </div>
  );
}

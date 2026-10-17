export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-[#f5f0e6] px-6 py-16" aria-label="Loading onboarding">
      <div className="mx-auto max-w-[720px] space-y-6">
        <div className="h-10 w-32 animate-pulse rounded-sm bg-[#e8e2d5]" />
        <div className="h-12 w-3/4 animate-pulse rounded-sm bg-[#e8e2d5]" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="h-24 animate-pulse rounded-sm bg-[#eee8dc]" />
          ))}
        </div>
      </div>
    </div>
  );
}

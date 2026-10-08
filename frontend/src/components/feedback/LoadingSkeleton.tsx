export function LoadingSkeleton({ lines = 3, label = 'Loading' }: { lines?: number; label?: string }) {
  return (
    <div role="status" aria-busy="true" className="grid gap-3">
      <span className="sr-only">{label}</span>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="h-4 rounded-sm bg-line motion-safe:animate-pulse"
          style={{ width: `${100 - (index % 3) * 15}%` }}
        />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8">
      <LoadingSkeleton lines={6} label="Loading page" />
    </div>
  )
}

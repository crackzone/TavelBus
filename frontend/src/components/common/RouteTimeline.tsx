import { formatCoordinate } from '../../lib/format.ts'
import { EmptyState } from './EmptyState.tsx'

export type TimelineStop = {
  id: string
  name: string
  sequenceNumber: number
  latitude?: number | null
  longitude?: number | null
}

export function RouteTimeline({ stops, activeStopId }: { stops: readonly TimelineStop[]; activeStopId?: string }) {
  const ordered = [...stops].sort((left, right) => left.sequenceNumber - right.sequenceNumber)
  if (ordered.length === 0) {
    return <EmptyState title="No stops" description="This route does not list any stops yet." />
  }

  return (
    <ol className="flex flex-col">
      {ordered.map((stop, index) => {
        const position = index === 0 ? 'Origin' : index === ordered.length - 1 ? 'Destination' : 'Stop'
        const current = stop.id === activeStopId
        const hasCoordinates = stop.latitude != null && stop.longitude != null
        return (
          <li key={stop.id} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-3" aria-current={current ? 'step' : undefined}>
            <div className="flex flex-col items-center" aria-hidden="true">
              <span className={current ? 'mt-1 size-3 rounded-full border-2 border-navy bg-navy' : 'mt-1 size-3 rounded-full border-2 border-navy bg-surface'} />
              {index < ordered.length - 1 ? <span className="w-px flex-1 bg-line" /> : null}
            </div>
            <div className={index < ordered.length - 1 ? 'pb-5' : undefined}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted">
                {current ? 'Next stop' : position} · {stop.sequenceNumber}
              </p>
              <p className="text-sm font-semibold text-ink">{stop.name}</p>
              {hasCoordinates ? (
                <p className="text-xs text-muted">
                  {formatCoordinate(stop.latitude as number)}, {formatCoordinate(stop.longitude as number)}
                </p>
              ) : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

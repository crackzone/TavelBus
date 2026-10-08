import type { ReactNode } from 'react'
import { formatCurrency, formatDateTime, formatDuration, minutesBetween } from '../../lib/format.ts'
import type { TripStatus } from '../../types/common.ts'
import { StatusBadge } from '../ui/StatusBadge.tsx'

export function TripCard({
  origin,
  destination,
  departure,
  arrival,
  fare,
  status,
  detail,
  action,
}: {
  origin: string
  destination: string
  departure: string
  arrival: string
  fare?: number
  status?: TripStatus
  detail?: string
  action?: ReactNode
}) {
  const duration = minutesBetween(departure, arrival)
  return (
    <article className="rounded-sm border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-ink">
          {origin} to {destination}
        </h3>
        {status ? <StatusBadge status={status} /> : null}
      </div>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Departure</dt>
          <dd className="mt-1 text-ink">
            <time dateTime={departure}>{formatDateTime(departure)}</time>
          </dd>
        </div>
        <div>
          <dt className="text-muted">Arrival</dt>
          <dd className="mt-1 text-ink">
            <time dateTime={arrival}>{formatDateTime(arrival)}</time>
          </dd>
        </div>
        {duration !== null ? (
          <div>
            <dt className="text-muted">Duration</dt>
            <dd className="mt-1 text-ink">{formatDuration(duration)}</dd>
          </div>
        ) : null}
        {fare !== undefined ? (
          <div>
            <dt className="text-muted">Fare</dt>
            <dd className="mt-1 text-ink">{formatCurrency(fare)}</dd>
          </div>
        ) : null}
      </dl>
      {detail ? <p className="mt-3 text-sm text-muted">{detail}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  )
}

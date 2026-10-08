import { ButtonLink } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { formatDateTime } from '../../lib/format.ts'
import type { DriverTrip } from '../../types/tracking.ts'
import type { RouteDetail } from '../../types/routes.ts'

export function TripSummary({ trip, route }: { trip: DriverTrip; route?: RouteDetail }) {
  const title = route ? `${route.origin} to ${route.destination}` : 'Route details are still loading'
  return (
    <article className="rounded-sm border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <StatusBadge status={trip.status} />
      </div>
      {route ? <p className="mt-1 text-sm text-muted">{route.name}</p> : null}
      <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Departure</dt>
          <dd className="mt-1 text-ink">{formatDateTime(trip.departure_time)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Arrival</dt>
          <dd className="mt-1 text-ink">{formatDateTime(trip.arrival_time)}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Bus</dt>
          <dd className="mt-1 text-ink">The driver trip does not include a bus name.</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink to={`/driver/trips/${trip.id}/active`}>Open trip</ButtonLink>
        <ButtonLink to={`/driver/trips/${trip.id}`} variant="secondary">
          Details
        </ButtonLink>
      </div>
    </article>
  )
}

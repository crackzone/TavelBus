import { Link, useParams } from 'react-router-dom'
import { MapPanel } from '../../components/common/MapPanel.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { RouteTimeline } from '../../components/common/RouteTimeline.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { ButtonLink } from '../../components/ui/Button.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { usePublicRouteQuery, usePublicTripQuery, useTripSeatsQuery } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency, formatDateTime, formatDuration, minutesBetween } from '../../lib/format.ts'

export function TripPage() {
  const { tripId } = useParams()
  const tripQuery = usePublicTripQuery(tripId)
  const routeQuery = usePublicRouteQuery(tripQuery.data?.route_id)
  const seatsQuery = useTripSeatsQuery(tripId)
  const title = routeQuery.data ? `${routeQuery.data.origin} to ${routeQuery.data.destination}` : 'Trip'
  useDocumentTitle(`${title} · TravelBus Manager`)

  if (!tripId) return <LoadFailure title="Trip reference is missing" error={new Error('Missing trip')} onRetry={() => undefined} />
  if (tripQuery.isPending) return <LoadingSkeleton lines={6} label="Loading trip" />
  if (tripQuery.isError || !tripQuery.data) {
    return <LoadFailure title="That trip could not be loaded" error={tripQuery.error} onRetry={() => void tripQuery.refetch()} />
  }

  const trip = tripQuery.data
  const duration = minutesBetween(trip.departure_time, trip.arrival_time)
  const available = seatsQuery.data?.filter((seat) => seat.status === 'AVAILABLE').length
  const stops = routeQuery.data?.stops ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={routeQuery.data?.name ?? 'Public trip details.'}
        actions={
          <ButtonLink to={`/passenger/trips/${trip.id}/seats`}>Select seat</ButtonLink>
        }
      />
      {routeQuery.isPending ? <LoadingSkeleton lines={3} label="Loading route" /> : null}
      {routeQuery.isError ? (
        <LoadFailure title="Route details could not be loaded" error={routeQuery.error} onRetry={() => void routeQuery.refetch()} />
      ) : null}
      <section className="rounded-sm border border-line bg-surface p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-ink">Schedule</h2>
          <StatusBadge status={trip.status} />
        </div>
        <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">Departure</dt>
            <dd className="mt-1 text-ink">
              <time dateTime={trip.departure_time}>{formatDateTime(trip.departure_time)}</time>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Arrival</dt>
            <dd className="mt-1 text-ink">
              <time dateTime={trip.arrival_time}>{formatDateTime(trip.arrival_time)}</time>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Duration</dt>
            <dd className="mt-1 text-ink">{duration === null ? 'Not available' : formatDuration(duration)}</dd>
          </div>
          <div>
            <dt className="text-muted">Fare</dt>
            <dd className="mt-1 text-ink">{formatCurrency(trip.fare)}</dd>
          </div>
          <div>
            <dt className="text-muted">Bus</dt>
            <dd className="mt-1 text-ink">The public trip does not include a bus name.</dd>
          </div>
          <div>
            <dt className="text-muted">Seat availability</dt>
            <dd className="mt-1 text-ink">
              {seatsQuery.isPending
                ? 'Checking seats'
                : seatsQuery.isError
                  ? 'Seat availability could not be loaded'
                  : `${available ?? 0} of ${seatsQuery.data?.length ?? 0} seats available`}
            </dd>
          </div>
        </dl>
      </section>
      {routeQuery.data ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-sm border border-line bg-surface p-4">
            <h2 className="text-base font-semibold text-ink">Stops</h2>
            <div className="mt-4">
              <RouteTimeline
                stops={stops.map((stop) => ({
                  id: stop.id,
                  name: stop.name,
                  sequenceNumber: stop.sequence_number,
                  latitude: stop.latitude,
                  longitude: stop.longitude,
                }))}
              />
            </div>
          </div>
          <MapPanel
            title="Stop coordinates"
            emptyMessage="This route has no coordinates for its stops."
            points={stops
              .filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))
              .map((stop) => ({
                id: stop.id,
                label: stop.name,
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
          />
        </section>
      ) : null}
      <p className="text-sm text-muted">
        <Link to="/passenger/search" className="focus-ring font-medium text-brand">
          Back to search
        </Link>
      </p>
    </div>
  )
}

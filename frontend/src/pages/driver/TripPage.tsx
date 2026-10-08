import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { RouteTimeline } from '../../components/common/RouteTimeline.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { ButtonLink } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { useDriverTripsQuery } from '../../features/driver/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { usePublicRouteQuery } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency, formatDateTime } from '../../lib/format.ts'

export function TripPage() {
  const { tripId } = useParams()
  const tripsQuery = useDriverTripsQuery()
  const trip = tripsQuery.data?.find((item) => item.id === tripId)
  const routeQuery = usePublicRouteQuery(trip?.route_id)
  const title =
    tripId && tripsQuery.data && !trip
      ? 'Trip not assigned'
      : routeQuery.data
        ? `${routeQuery.data.origin} to ${routeQuery.data.destination}`
        : 'Assigned trip'
  useDocumentTitle(`${title} · TravelBus Manager`)

  if (!tripId) return <LoadFailure title="Trip reference is missing" error={new Error('Missing trip')} onRetry={() => undefined} />
  if (tripsQuery.isPending) return <LoadingSkeleton lines={5} label="Loading assigned trip" />
  if (tripsQuery.isError) {
    return <LoadFailure title="Assigned trips could not be loaded" error={tripsQuery.error} onRetry={() => void tripsQuery.refetch()} />
  }
  if (!trip) {
    return (
      <EmptyState
        title="Trip not assigned"
        description="This trip is not on the signed-in driver's list."
        action={
          <ButtonLink to="/driver/trips" variant="secondary">
            Back to trips
          </ButtonLink>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={title}
        description={routeQuery.data?.name}
        actions={<StatusBadge status={trip.status} />}
      />
      <dl className="grid grid-cols-2 gap-4 rounded-sm border border-line bg-surface p-4 text-sm shadow-panel">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Departure</dt>
          <dd className="mt-1 text-ink">{formatDateTime(trip.departure_time)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Arrival</dt>
          <dd className="mt-1 text-ink">{formatDateTime(trip.arrival_time)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Fare</dt>
          <dd className="mt-1 text-ink">{formatCurrency(trip.fare)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Bus</dt>
          <dd className="mt-1 text-ink">The driver trip does not include a bus name.</dd>
        </div>
      </dl>
      <ButtonLink to={`/driver/trips/${trip.id}/active`} className="w-full">
        Open active trip
      </ButtonLink>
      {routeQuery.isLoading ? <LoadingSkeleton lines={4} label="Loading stops" /> : null}
      {routeQuery.isError ? (
        <LoadFailure title="Stops could not be loaded" error={routeQuery.error} onRetry={() => void routeQuery.refetch()} />
      ) : null}
      {routeQuery.data ? (
        <section className="rounded-sm border border-line bg-surface p-4 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Stops</h2>
          <div className="mt-4">
            <RouteTimeline
              stops={routeQuery.data.stops.map((stop) => ({
                id: stop.id,
                name: stop.name,
                sequenceNumber: stop.sequence_number,
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
            />
          </div>
        </section>
      ) : null}
      <p className="text-sm text-muted">
        <Link to="/driver/trips" className="focus-ring font-medium text-brand">
          Back to trips
        </Link>
      </p>
    </div>
  )
}

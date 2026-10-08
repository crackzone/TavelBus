import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { MapPanel, type MapPoint } from '../../components/common/MapPanel.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { TrackingStatus } from '../../components/common/TrackingStatus.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { driverLabel } from '../../features/admin/labels.ts'
import { useAdminRoutesQuery, useBusesQuery, useRunningTripsQuery } from '../../features/admin/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useClock, useTripLocationQuery } from '../../features/passenger/hooks.ts'
import { applyTrackingEvent, isLocationStale, staleLocationSentence } from '../../features/passenger/tracking.ts'
import { useTrackingChannel } from '../../features/passenger/useTrackingChannel.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCoordinate, formatDateTime, formatDuration, formatKilometers, formatSpeed } from '../../lib/format.ts'
import type { ConnectionState } from '../../types/common.ts'
import type { Trip } from '../../types/trips.ts'
import type { TrackingStreamEvent, TripLocation } from '../../types/tracking.ts'

export function LiveTrackingPage() {
  useDocumentTitle('Live tracking · TravelBus Manager')
  const trips = useRunningTripsQuery()
  const routes = useAdminRoutesQuery()
  const buses = useBusesQuery()
  const now = useClock(15_000)

  if (trips.isPending || routes.isPending || buses.isPending) {
    return <LoadingSkeleton lines={6} label="Loading running buses" />
  }
  if (trips.isError) {
    return <LoadFailure title="Running trips could not be loaded" error={trips.error} onRetry={() => void trips.refetch()} />
  }
  if (routes.isError) {
    return <LoadFailure title="Routes could not be loaded" error={routes.error} onRetry={() => void routes.refetch()} />
  }
  if (buses.isError) {
    return <LoadFailure title="Fleet could not be loaded" error={buses.error} onRetry={() => void buses.refetch()} />
  }

  const running = trips.data?.items ?? []

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Live tracking"
        description="Buses on trips that are in progress. Position, speed, and the next stop appear when a location exists."
      />
      {running.length === 0 ? (
        <EmptyState
          title="No buses are running"
          description="A bus appears here after its trip is in progress. Scheduled trips stay on the trips list."
          action={
            <Link to="/admin/trips" className="focus-ring text-sm font-medium text-brand">
              View trips
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {running.map((trip) => {
            const route = routes.data?.items.find((item) => item.id === trip.route_id)
            const bus = buses.data?.items.find((item) => item.id === trip.bus_id)
            return (
              <ActiveRun
                key={trip.id}
                trip={trip}
                now={now}
                busLabel={bus ? `${bus.registration_number} · ${bus.display_name}` : 'Bus details are unavailable'}
                routeLabel={route ? `${route.origin} to ${route.destination}` : 'Route details are unavailable'}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

function ActiveRun({
  trip,
  now,
  busLabel,
  routeLabel,
}: {
  trip: Trip
  now: number
  busLabel: string
  routeLabel: string
}) {
  const queryClient = useQueryClient()
  const locationQuery = useTripLocationQuery(trip.id)
  const onEvent = useCallback(
    (event: TrackingStreamEvent) => {
      applyTrackingEvent(queryClient, trip.id, event)
      if ('event_type' in event && (event.event_type === 'TRIP_STARTED' || event.event_type === 'TRIP_COMPLETED')) {
        void queryClient.invalidateQueries({ queryKey: ['trips', 'admin'] })
      }
    },
    [queryClient, trip.id],
  )
  const channel = useTrackingChannel(trip.id, locationQuery.isSuccess, onEvent)
  const location = locationQuery.data
  const recordedAt = location?.latest_location?.recorded_at
  const stale = recordedAt ? isLocationStale(recordedAt, now) : false
  const shownState: ConnectionState = stale ? 'STALE' : channel

  return (
    <article className="flex flex-col gap-4 rounded-sm border border-line bg-surface p-4 shadow-panel">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink">{busLabel}</h2>
          <p className="mt-1 text-sm text-muted">{routeLabel}</p>
        </div>
        <StatusBadge status={location?.trip_status ?? trip.status} />
      </header>
      {locationQuery.isLoading ? <LoadingSkeleton lines={4} label="Loading the latest position" /> : null}
      {locationQuery.isError ? (
        <LoadFailure title="Live location could not be loaded" error={locationQuery.error} onRetry={() => void locationQuery.refetch()} />
      ) : null}
      {location ? (
        <>
          <TrackingStatus
            state={shownState}
            detail={stale && recordedAt ? staleLocationSentence(recordedAt, now) : undefined}
          />
          <RunFacts trip={trip} location={location} />
          <MapPanel
            title="Current position"
            activePointId={location.latest_location ? 'bus' : undefined}
            emptyMessage="Live location is currently unavailable."
            points={busPoint(busLabel, location)}
          />
        </>
      ) : null}
      <Link to={`/admin/trips/${trip.id}`} className="focus-ring text-sm font-medium text-brand">
        Open trip
      </Link>
    </article>
  )
}

function RunFacts({ trip, location }: { trip: Trip; location: TripLocation }) {
  const latest = location.latest_location
  const next = location.next_stop
  const eta =
    next?.estimated_minutes_away == null
      ? 'Not reported'
      : Math.round(next.estimated_minutes_away) <= 0
        ? 'Less than a minute'
        : formatDuration(Math.round(next.estimated_minutes_away))

  return (
    <dl className="grid grid-cols-2 gap-4 text-sm">
      <Field term="Driver" value={driverLabel(trip.driver_id)} mono={trip.driver_id !== null} />
      <Field
        term="Current position"
        value={latest ? `${formatCoordinate(latest.latitude)}, ${formatCoordinate(latest.longitude)}` : 'Live location is currently unavailable.'}
      />
      <Field term="Speed" value={latest ? formatSpeed(latest.speed_kmph) : 'Not reported'} />
      <Field term="Next stop" value={next?.stop_name ?? 'Not reported'} />
      <Field term="Distance" value={next ? formatKilometers(next.distance_km) : 'Not reported'} />
      <Field term="ETA" value={eta} />
      <Field term="Last update" value={latest ? formatDateTime(latest.recorded_at) : 'Not reported'} />
    </dl>
  )
}

function Field({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className={mono ? 'mt-1 font-mono text-xs text-ink' : 'mt-1 text-ink'}>{value}</dd>
    </div>
  )
}

function busPoint(label: string, location: TripLocation): MapPoint[] {
  const latest = location.latest_location
  if (!latest) return []
  return [
    {
      id: 'bus',
      label,
      latitude: latest.latitude,
      longitude: latest.longitude,
      kind: 'bus',
      detail: formatSpeed(latest.speed_kmph),
    },
  ]
}

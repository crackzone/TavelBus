import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPanel, type MapPoint } from '../../components/common/MapPanel.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { RouteTimeline } from '../../components/common/RouteTimeline.tsx'
import { TrackingStatus } from '../../components/common/TrackingStatus.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { ButtonLink } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useBookingQuery, useClock, usePublicRouteQuery, usePublicTripQuery, useTripLocationQuery } from '../../features/passenger/hooks.ts'
import { applyTrackingEvent, isLocationStale, staleLocationSentence } from '../../features/passenger/tracking.ts'
import { useTrackingChannel } from '../../features/passenger/useTrackingChannel.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatDateTime, formatDuration, formatKilometers, formatSeat, formatSpeed } from '../../lib/format.ts'
import type { ConnectionState } from '../../types/common.ts'
import type { TrackingStreamEvent, TripLocation } from '../../types/tracking.ts'

export function TrackingPage() {
  const { bookingId } = useParams()
  const queryClient = useQueryClient()
  const bookingQuery = useBookingQuery(bookingId)
  const tripId = bookingQuery.data?.trip_id
  const tripQuery = usePublicTripQuery(tripId)
  const routeQuery = usePublicRouteQuery(tripQuery.data?.route_id)
  const locationQuery = useTripLocationQuery(tripId)
  const now = useClock(15_000)
  const onEvent = useCallback(
    (event: TrackingStreamEvent) => {
      if (tripId) applyTrackingEvent(queryClient, tripId, event)
    },
    [queryClient, tripId],
  )
  const channel = useTrackingChannel(tripId, locationQuery.isSuccess, onEvent)
  const reference = bookingQuery.data?.booking_reference ?? 'Track bus'
  useDocumentTitle(`${reference} tracking · TravelBus Manager`)

  if (!bookingId) return <LoadFailure title="Booking reference is missing" error={new Error('Missing booking')} onRetry={() => undefined} />
  if (bookingQuery.isPending) return <LoadingSkeleton lines={6} label="Loading tracking" />
  if (bookingQuery.isError || !bookingQuery.data) {
    return <LoadFailure title="That booking could not be loaded" error={bookingQuery.error} onRetry={() => void bookingQuery.refetch()} />
  }

  const booking = bookingQuery.data
  const location = locationQuery.data
  const routeName = routeQuery.data ? `${routeQuery.data.origin} to ${routeQuery.data.destination}` : 'Live position for this booking.'
  const recordedAt = location?.latest_location?.recorded_at
  const stale = recordedAt ? isLocationStale(recordedAt, now) : false
  const shownState: ConnectionState = stale ? 'STALE' : channel
  const interrupted = channel === 'RECONNECTING' || channel === 'DISCONNECTED'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Track bus"
        description={routeName}
        actions={
          <ButtonLink to={`/passenger/bookings/${booking.id}`} variant="secondary">
            View booking
          </ButtonLink>
        }
      />
      <p className="text-sm text-muted">
        Booking <span className="font-mono text-ink">{booking.booking_reference}</span>
        {' · '}Seat {formatSeat(booking.seat_number)}
      </p>
      {booking.status === 'CANCELLED' ? <Notice message="This booking is cancelled." /> : null}
      {locationQuery.isLoading ? <LoadingSkeleton lines={5} label="Loading the latest position" /> : null}
      {locationQuery.isError ? (
        <LoadFailure title="Live location could not be loaded" error={locationQuery.error} onRetry={() => void locationQuery.refetch()} />
      ) : null}
      {location ? (
        <>
          <TrackingStatus
            state={shownState}
            detail={
              stale
                ? [staleLocationSentence(recordedAt ?? '', now), interrupted ? 'Live tracking connection interrupted.' : null]
                    .filter((line) => line !== null)
                    .join(' ')
                : undefined
            }
          />
          <LiveFacts location={location} live={shownState === 'CONNECTED'} />
          <div className="grid gap-4 lg:grid-cols-2">
            <MapPanel
              title="Route and bus"
              activePointId={location.latest_location ? 'bus' : undefined}
              emptyMessage="Live location is currently unavailable."
              points={mapPoints(location, routeQuery.data?.stops ?? [])}
            />
            <section className="rounded-sm border border-line bg-surface p-4 shadow-panel">
              <h2 className="text-base font-semibold text-ink">Stops</h2>
              <div className="mt-4">
                {tripQuery.isLoading || routeQuery.isLoading ? <LoadingSkeleton lines={4} label="Loading stops" /> : null}
                {routeQuery.isError ? (
                  <LoadFailure title="Stops could not be loaded" error={routeQuery.error} onRetry={() => void routeQuery.refetch()} />
                ) : null}
                {routeQuery.data ? (
                  <RouteTimeline
                    activeStopId={location.next_stop?.stop_id}
                    stops={routeQuery.data.stops.map((stop) => ({
                      id: stop.id,
                      name: stop.name,
                      sequenceNumber: stop.sequence_number,
                      latitude: stop.latitude,
                      longitude: stop.longitude,
                    }))}
                  />
                ) : null}
              </div>
            </section>
          </div>
        </>
      ) : null}
      {tripQuery.isError ? (
        <LoadFailure title="The trip for this booking could not be loaded" error={tripQuery.error} onRetry={() => void tripQuery.refetch()} />
      ) : null}
      <p className="text-sm text-muted">
        <Link to={`/passenger/bookings/${booking.id}`} className="focus-ring font-medium text-brand">
          Back to booking
        </Link>
      </p>
    </div>
  )
}

function LiveFacts({ location, live }: { location: TripLocation; live: boolean }) {
  const latest = location.latest_location
  const next = location.next_stop
  if (!latest) {
    return (
      <EmptyState
        title="No live location"
        description="Live location is currently unavailable."
        action={<StatusBadge status={location.trip_status} />}
      />
    )
  }

  const speed = latest.speed_kmph
  const movement = live ? (speed > 0 ? 'Bus is moving' : 'Bus is stopped') : null
  const eta =
    next?.estimated_minutes_away == null
      ? 'Not reported'
      : Math.round(next.estimated_minutes_away) <= 0
        ? 'Less than a minute'
        : formatDuration(Math.round(next.estimated_minutes_away))

  return (
    <section className="rounded-sm border border-line bg-surface p-4 shadow-panel" aria-label="Live tracking">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{movement ?? 'Last reported position'}</h2>
        <StatusBadge status={location.trip_status} />
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-4">
        <Fact term="Next stop" value={next?.stop_name ?? 'Not reported'} />
        <Fact term="Distance" value={next ? formatKilometers(next.distance_km) : 'Not reported'} />
        <Fact term="ETA" value={eta} />
        <Fact term="Speed" value={formatSpeed(speed)} />
        <Fact term="Last updated" value={formatDateTime(latest.recorded_at)} />
        <Fact term="Heading" value={latest.heading == null ? 'Not reported' : `${Math.round(latest.heading)}°`} />
      </dl>
    </section>
  )
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className="mt-1 text-sm font-medium text-ink">{value}</dd>
    </div>
  )
}

function mapPoints(location: TripLocation, stops: readonly { id: string; name: string; sequence_number: number; latitude: number; longitude: number }[]): MapPoint[] {
  const ordered = [...stops].sort((left, right) => left.sequence_number - right.sequence_number)
  const points: MapPoint[] = ordered
    .filter((stop) => Number.isFinite(stop.latitude) && Number.isFinite(stop.longitude))
    .map((stop) => ({
      id: stop.id,
      label: stop.name,
      latitude: stop.latitude,
      longitude: stop.longitude,
      kind: 'stop',
      detail: location.next_stop?.stop_id === stop.id ? 'Next stop' : undefined,
    }))
  const latest = location.latest_location
  if (!latest) return points
  for (const breadcrumb of location.recent_breadcrumbs) {
    if (breadcrumb.id === latest.id) continue
    points.push({
      id: breadcrumb.id,
      label: 'Recent position',
      latitude: breadcrumb.latitude,
      longitude: breadcrumb.longitude,
      kind: 'trail',
    })
  }
  points.push({
    id: 'bus',
    label: 'Bus',
    latitude: latest.latitude,
    longitude: latest.longitude,
    kind: 'bus',
    detail: formatSpeed(latest.speed_kmph),
  })
  return points
}

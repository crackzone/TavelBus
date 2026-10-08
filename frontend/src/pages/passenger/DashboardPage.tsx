import { useMemo } from 'react'
import { BookingCard } from '../../components/common/BookingCard.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { ButtonLink } from '../../components/ui/Button.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useClock, useMyBookingsQuery, useRoutesById, useTripsById } from '../../features/passenger/hooks.ts'
import { nextUpcoming } from '../../features/passenger/match.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatDuration, minutesUntil } from '../../lib/format.ts'
import type { Booking } from '../../types/bookings.ts'
import type { RouteDetail } from '../../types/routes.ts'
import type { PublicTrip } from '../../types/trips.ts'

export function DashboardPage() {
  useDocumentTitle('Home · TravelBus Manager')
  const bookings = useMyBookingsQuery()
  const now = useClock()
  const items = useMemo(() => bookings.data?.items ?? [], [bookings.data])
  const tripIds = useMemo(() => [...new Set(items.map((item) => item.trip_id))], [items])
  const tripQueries = useTripsById(tripIds)
  const trips = useMemo(() => {
    const map = new Map<string, PublicTrip>()
    tripIds.forEach((tripId, index) => {
      const trip = tripQueries[index]?.data
      if (trip) map.set(tripId, trip)
    })
    return map
  }, [tripIds, tripQueries])
  const routeIds = useMemo(() => [...new Set([...trips.values()].map((trip) => trip.route_id))], [trips])
  const routeQueries = useRoutesById(routeIds)
  const routes = useMemo(() => {
    const map = new Map<string, RouteDetail>()
    routeIds.forEach((routeId, index) => {
      const route = routeQueries[index]?.data
      if (route) map.set(routeId, route)
    })
    return map
  }, [routeIds, routeQueries])

  const tripError = tripQueries.find((query) => query.isError)?.error
  const loading = bookings.isPending || tripQueries.some((query) => query.isPending) || routeQueries.some((query) => query.isPending)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Home"
        description="Your next departure, seat, and booking reference."
        actions={
          <ButtonLink to="/passenger/search" variant="secondary">
            Search Trips
          </ButtonLink>
        }
      />
      {bookings.isError ? (
        <LoadFailure title="Bookings could not be loaded" error={bookings.error} onRetry={() => void bookings.refetch()} />
      ) : tripError ? (
        <LoadFailure
          title="A trip on your bookings could not be loaded"
          error={tripError}
          onRetry={() => {
            void bookings.refetch()
            for (const query of tripQueries) void query.refetch()
          }}
        />
      ) : loading ? (
        <LoadingSkeleton lines={5} label="Loading your next trip" />
      ) : (
        <UpcomingTrip items={items} trips={trips} routes={routes} now={now} />
      )}
    </div>
  )
}

function UpcomingTrip({
  items,
  trips,
  routes,
  now,
}: {
  items: readonly Booking[]
  trips: ReadonlyMap<string, PublicTrip>
  routes: ReadonlyMap<string, RouteDetail>
  now: number
}) {
  const booking = nextUpcoming(items, trips, now)
  if (!booking) {
    return (
      <EmptyState
        title="No upcoming trips"
        description={
          items.length > 0
            ? 'None of your confirmed bookings depart later than now.'
            : 'Search for a route, then open a trip reference to reserve a seat.'
        }
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink to="/passenger/search">Search Trips</ButtonLink>
            {items.length > 0 ? (
              <ButtonLink to="/passenger/bookings" variant="secondary">
                View bookings
              </ButtonLink>
            ) : null}
          </div>
        }
      />
    )
  }

  const trip = trips.get(booking.trip_id)
  const route = trip ? routes.get(trip.route_id) : undefined
  const remaining = trip ? minutesUntil(trip.departure_time, now) : null

  return (
    <BookingCard
      reference={booking.booking_reference}
      seatNumber={booking.seat_number}
      amount={booking.amount}
      status={booking.status}
      paymentStatus={booking.payment_status}
      origin={route?.origin}
      destination={route?.destination}
      departure={trip?.departure_time}
      action={
        <div className="flex flex-col gap-3">
          {remaining !== null ? (
            <p className="text-sm text-ink">{remaining === 0 ? 'Departs in less than a minute' : `Departs in ${formatDuration(remaining)}`}</p>
          ) : null}
          {!route ? <p className="text-sm text-muted">Route details are not available for this trip.</p> : null}
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/passenger/bookings/${booking.id}/tracking`}>Track bus</ButtonLink>
            <ButtonLink to={`/passenger/bookings/${booking.id}`} variant="secondary">
              View booking
            </ButtonLink>
          </div>
        </div>
      }
    />
  )
}

import { useMemo } from 'react'
import { BookingCard } from '../../components/common/BookingCard.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { ButtonLink } from '../../components/ui/Button.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useMyBookingsQuery, useRoutesById, useTripsById } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import type { PublicTrip } from '../../types/trips.ts'
import type { RouteDetail } from '../../types/routes.ts'

export function BookingsPage() {
  useDocumentTitle('My bookings · TravelBus Manager')
  const bookings = useMyBookingsQuery()
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
  const loading = bookings.isPending || tripQueries.some((query) => query.isPending)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My bookings" description="References, seats, amounts, and payment status from your account." />
      {bookings.isError ? (
        <LoadFailure title="Bookings could not be loaded" error={bookings.error} onRetry={() => void bookings.refetch()} />
      ) : loading ? (
        <LoadingSkeleton lines={5} label="Loading bookings" />
      ) : items.length === 0 ? (
        <EmptyState
          title="You don't have any bookings yet."
          description="Search for a route and open a trip reference to reserve a seat."
          action={<ButtonLink to="/passenger/search">Search Trips</ButtonLink>}
        />
      ) : (
        <ul className="grid gap-4">
          {items.map((booking) => {
            const trip = trips.get(booking.trip_id)
            const route = trip ? routes.get(trip.route_id) : undefined
            return (
              <li key={booking.id}>
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
                    <ButtonLink to={`/passenger/bookings/${booking.id}`} variant="secondary">
                      View booking
                    </ButtonLink>
                  }
                />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { useAdminRoutesQuery, useAdminTripQuery } from '../../features/admin/hooks.ts'
import { useBookingQuery } from '../../features/passenger/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency, formatDateTime, formatSeat } from '../../lib/format.ts'

export function BookingPage() {
  const { bookingId } = useParams()
  const bookingQuery = useBookingQuery(bookingId)
  const booking = bookingQuery.data
  const tripQuery = useAdminTripQuery(booking?.trip_id)
  const routes = useAdminRoutesQuery()
  const route = routes.data?.items.find((item) => item.id === tripQuery.data?.route_id)
  useDocumentTitle(`${booking?.booking_reference ?? 'Booking'} · TravelBus Manager`)

  if (!bookingId) return <LoadFailure title="Booking reference is missing" error={new Error('Missing booking')} onRetry={() => undefined} />
  if (bookingQuery.isPending) return <LoadingSkeleton lines={5} label="Loading booking" />
  if (bookingQuery.isError || !booking) {
    return <LoadFailure title="That booking could not be loaded" error={bookingQuery.error} onRetry={() => void bookingQuery.refetch()} />
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={booking.booking_reference} description="Booking details from the account service." />
      <dl className="grid gap-4 rounded-sm border border-line bg-surface p-4 text-sm shadow-panel sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Passenger</dt>
          <dd className="mt-1 text-ink">The booking does not include the passenger name.</dd>
          <dd className="mt-1 font-mono text-xs text-muted">{booking.user_id}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Route</dt>
          <dd className="mt-1 text-ink">{route ? `${route.origin} to ${route.destination}` : 'Route details are still loading'}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Trip</dt>
          <dd className="mt-1">
            <Link to={`/admin/trips/${booking.trip_id}`} className="focus-ring font-mono text-xs text-brand">
              {booking.trip_id}
            </Link>
          </dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Seat</dt>
          <dd className="mt-1 text-ink">{formatSeat(booking.seat_number)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Amount</dt>
          <dd className="mt-1 text-ink">{formatCurrency(booking.amount)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Status</dt>
          <dd className="mt-1"><StatusBadge status={booking.status} /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Payment status</dt>
          <dd className="mt-1"><StatusBadge status={booking.payment_status} /></dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Created</dt>
          <dd className="mt-1 text-ink">{formatDateTime(booking.created_at)}</dd>
        </div>
      </dl>
      <Link to="/admin/bookings" className="focus-ring text-sm font-medium text-brand">Back to bookings</Link>
    </div>
  )
}

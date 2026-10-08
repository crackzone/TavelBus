import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, type DataColumn } from '../../components/common/DataTable.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { useAdminBookingsQuery, useAdminRoutesQuery, useAdminTripsQuery } from '../../features/admin/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency, formatDateTime, formatSeat } from '../../lib/format.ts'
import { bookingStatuses, type BookingStatus } from '../../types/common.ts'
import type { AdminBookingQuery, Booking } from '../../types/bookings.ts'
import type { Trip } from '../../types/trips.ts'

export function BookingsPage() {
  useDocumentTitle('Bookings · TravelBus Manager')
  const trips = useAdminTripsQuery({})
  const routes = useAdminRoutesQuery()
  const [tripId, setTripId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const filters = useMemo<AdminBookingQuery>(
    () => ({
      trip_id: tripId || undefined,
      status: isBookingStatus(status) ? status : undefined,
    }),
    [status, tripId],
  )
  const bookings = useAdminBookingsQuery(filters)
  const tripMap = useMemo(() => new Map((trips.data?.items ?? []).map((trip) => [trip.id, trip])), [trips.data])
  const routeNames = useMemo(() => new Map((routes.data?.items ?? []).map((route) => [route.id, route.name])), [routes.data])
  const query = search.trim().toLocaleLowerCase()
  const rows = (bookings.data?.items ?? []).filter((booking) => {
    if (!query) return true
    return booking.booking_reference.toLocaleLowerCase().includes(query) || booking.user_id.toLocaleLowerCase().includes(query)
  })

  const columns: readonly DataColumn<Booking>[] = [
    {
      id: 'reference',
      header: 'Booking reference',
      cell: (booking) => (
        <Link to={`/admin/bookings/${booking.id}`} className="focus-ring font-mono text-xs font-medium text-brand">
          {booking.booking_reference}
        </Link>
      ),
    },
    { id: 'passenger', header: 'Passenger', cell: () => 'Name is not on the booking' },
    { id: 'route', header: 'Route', cell: (booking) => routeLabel(tripMap.get(booking.trip_id), routeNames) },
    { id: 'trip', header: 'Trip', cell: (booking) => <span className="font-mono text-xs">{booking.trip_id}</span> },
    { id: 'seat', header: 'Seat', cell: (booking) => formatSeat(booking.seat_number) },
    { id: 'amount', header: 'Amount', cell: (booking) => formatCurrency(booking.amount) },
    { id: 'status', header: 'Status', cell: (booking) => <StatusBadge status={booking.status} /> },
    { id: 'payment', header: 'Payment status', cell: (booking) => <StatusBadge status={booking.payment_status} /> },
    { id: 'created', header: 'Created', cell: (booking) => formatDateTime(booking.created_at) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Bookings"
        description="References, seats, amounts, and payment status. The booking list does not include the passenger name."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Input id="booking-search" label="Search" value={search} onChange={(event) => setSearch(event.target.value)} hint="Reference or passenger account id." />
        <Select
          id="booking-trip"
          label="Trip"
          value={tripId}
          onChange={(event) => setTripId(event.target.value)}
          options={[{ value: '', label: 'All trips' }, ...(trips.data?.items ?? []).map((trip) => ({ value: trip.id, label: routeNames.get(trip.route_id) ?? trip.id }))]}
        />
        <Select
          id="booking-status"
          label="Status"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          options={[{ value: '', label: 'All statuses' }, ...bookingStatuses.map((item) => ({ value: item, label: item }))]}
        />
      </div>
      {bookings.isPending ? <LoadingSkeleton lines={5} label="Loading bookings" /> : null}
      {bookings.isError ? <LoadFailure title="Bookings could not be loaded" error={bookings.error} onRetry={() => void bookings.refetch()} /> : null}
      {bookings.data ? (
        <DataTable
          caption="Bookings"
          columns={columns}
          rows={rows}
          getRowKey={(booking) => booking.id}
          emptyTitle="No bookings"
          emptyDescription={query || tripId || status ? 'No bookings match these filters.' : 'No bookings are stored.'}
        />
      ) : null}
    </div>
  )
}

function routeLabel(trip: Trip | undefined, routeNames: ReadonlyMap<string, string>): string {
  if (!trip) return 'Trip details are still loading'
  return routeNames.get(trip.route_id) ?? 'Route details are still loading'
}

function isBookingStatus(value: string): value is BookingStatus {
  return bookingStatuses.some((status) => status === value)
}

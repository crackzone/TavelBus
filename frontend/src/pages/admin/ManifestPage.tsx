import { Link, useParams } from 'react-router-dom'
import { DataTable, type DataColumn } from '../../components/common/DataTable.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { useManifestQuery } from '../../features/admin/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency, formatDateTime, formatPercent, formatSeat } from '../../lib/format.ts'
import type { ManifestPassenger } from '../../types/revenue.ts'

export function ManifestPage() {
  const { tripId } = useParams()
  const manifestQuery = useManifestQuery(tripId)
  const manifest = manifestQuery.data
  useDocumentTitle(`${manifest?.route_name ?? 'Manifest'} · TravelBus Manager`)

  if (!tripId) return <LoadFailure title="Trip reference is missing" error={new Error('Missing trip')} onRetry={() => undefined} />
  if (manifestQuery.isPending) return <LoadingSkeleton lines={6} label="Loading manifest" />
  if (manifestQuery.isError || !manifest) {
    return <LoadFailure title="That manifest could not be loaded" error={manifestQuery.error} onRetry={() => void manifestQuery.refetch()} />
  }

  const columns: readonly DataColumn<ManifestPassenger>[] = [
    { id: 'seat', header: 'Seat', cell: (passenger) => formatSeat(passenger.seat_number) },
    { id: 'passenger', header: 'Passenger', cell: (passenger) => passenger.passenger_name },
    { id: 'email', header: 'Email', cell: (passenger) => passenger.passenger_email },
    { id: 'phone', header: 'Phone', cell: (passenger) => passenger.passenger_phone ?? 'Not provided' },
    { id: 'status', header: 'Booking status', cell: (passenger) => <StatusBadge status={passenger.booking_status} /> },
    { id: 'fare', header: 'Fare', cell: (passenger) => formatCurrency(passenger.fare_paid) },
    { id: 'booked', header: 'Booked at', cell: (passenger) => formatDateTime(passenger.booked_at) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={manifest.route_name}
        description={`${manifest.bus_registration} · ${formatDateTime(manifest.departure_time)}`}
        actions={<StatusBadge status={manifest.trip_status} />}
      />
      <dl className="grid gap-4 rounded-sm border border-line bg-surface p-4 text-sm shadow-panel sm:grid-cols-2 xl:grid-cols-3">
        <Item term="Bus" value={manifest.bus_registration} />
        <Item term="Departure" value={formatDateTime(manifest.departure_time)} />
        <Item term="Status" value={manifest.trip_status} />
        <Item term="Capacity" value={String(manifest.seat_capacity)} />
        <Item term="Seats booked" value={String(manifest.seats_booked)} />
        <Item term="Occupancy" value={formatPercent(manifest.occupancy_rate_pct)} />
        <Item term="Revenue" value={formatCurrency(manifest.trip_gross_revenue)} />
      </dl>
      <DataTable
        caption="Passengers"
        columns={columns}
        rows={manifest.passengers}
        getRowKey={(passenger) => passenger.booking_id}
        emptyTitle="No passengers"
        emptyDescription="This trip has no bookings on the manifest."
      />
      <Link to={`/admin/trips/${manifest.trip_id}`} className="focus-ring text-sm font-medium text-brand">
        Back to trip
      </Link>
    </div>
  )
}

function Item({ term, value }: { term: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className="mt-1 text-ink">{value}</dd>
    </div>
  )
}

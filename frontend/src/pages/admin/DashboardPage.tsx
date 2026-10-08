import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { KpiCard } from '../../components/common/KpiCard.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { useAdminRoutesQuery, useAdminTripsQuery, useBusesQuery, useRevenueSummaryQuery } from '../../features/admin/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useClock } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency, formatDateTime, localDateKey } from '../../lib/format.ts'
import type { Bus } from '../../types/fleet.ts'
import type { Route } from '../../types/routes.ts'
import type { Trip } from '../../types/trips.ts'

export function DashboardPage() {
  useDocumentTitle('Overview · TravelBus Manager')
  const now = useClock()
  const buses = useBusesQuery()
  const routes = useAdminRoutesQuery()
  const trips = useAdminTripsQuery({})
  const revenue = useRevenueSummaryQuery({})
  const todayKey = localDateKey(new Date(now).toISOString())
  const routeNames = useMemo(() => namesById(routes.data?.items ?? []), [routes.data])
  const busNames = useMemo(() => busLabels(buses.data?.items ?? []), [buses.data])
  const today = useMemo(
    () => (trips.data?.items ?? []).filter((trip) => localDateKey(trip.departure_time) === todayKey),
    [todayKey, trips.data],
  )
  const listPending = buses.isPending || routes.isPending || trips.isPending
  const listFailure = buses.error ?? routes.error ?? trips.error
  const activeBuses = buses.data?.items.filter((bus) => bus.status === 'ACTIVE').length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Overview"
        description="Revenue, bookings, and seats sold come from the revenue summary. Active buses come from the fleet, and today's trips are departures on today's date."
        actions={
          <Link to="/admin/revenue" className="focus-ring text-sm font-medium text-brand">
            View revenue
          </Link>
        }
      />
      {revenue.isPending || buses.isPending || trips.isPending ? <LoadingSkeleton lines={4} label="Loading overview" /> : null}
      {revenue.isError ? (
        <LoadFailure title="Revenue summary could not be loaded" error={revenue.error} onRetry={() => void revenue.refetch()} />
      ) : null}
      {listFailure ? (
        <LoadFailure
          title="Fleet or trip counts could not be loaded"
          error={listFailure}
          onRetry={() => {
            void buses.refetch()
            void routes.refetch()
            void trips.refetch()
          }}
        />
      ) : null}
      {revenue.data && activeBuses !== undefined && trips.data ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Gross revenue" value={formatCurrency(revenue.data.gross_revenue)} detail={`Refunded ${formatCurrency(revenue.data.refunded_revenue)}`} />
          <KpiCard label="Net revenue" value={formatCurrency(revenue.data.net_revenue)} />
          <KpiCard label="Bookings" value={String(revenue.data.total_bookings)} />
          <KpiCard label="Confirmed bookings" value={String(revenue.data.confirmed_bookings)} />
          <KpiCard label="Cancelled bookings" value={String(revenue.data.cancelled_bookings)} />
          <KpiCard label="Active buses" value={String(activeBuses)} detail={`${buses.data?.total ?? 0} in the fleet`} />
          <KpiCard label="Today's trips" value={String(today.length)} detail={`${trips.data.total} scheduled trips`} />
          <KpiCard label="Seats sold" value={String(revenue.data.total_seats_sold)} />
        </div>
      ) : null}
      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold text-ink">Trips departing today</h2>
        {listPending ? <LoadingSkeleton lines={3} label="Loading today's trips" /> : null}
        {trips.data && !listPending ? (
          today.length === 0 ? (
            <EmptyState
              title="No trips today"
              description="No scheduled trip departs on today's date."
              action={
                <Link to="/admin/trips" className="focus-ring text-sm font-medium text-brand">
                  View trips
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3">
              {today.map((trip) => (
                <TodayTrip key={trip.id} trip={trip} route={routeNames.get(trip.route_id)} bus={busNames.get(trip.bus_id)} />
              ))}
            </div>
          )
        ) : null}
      </section>
    </div>
  )
}

function TodayTrip({ trip, route, bus }: { trip: Trip; route?: string; bus?: string }) {
  return (
    <article className="rounded-sm border border-line bg-surface p-4 shadow-panel">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-sm font-semibold text-ink">{route ?? 'Route details are still loading'}</h3>
        <StatusBadge status={trip.status} />
      </div>
      <p className="mt-2 text-sm text-muted">{formatDateTime(trip.departure_time)}</p>
      <p className="mt-1 text-sm text-ink">{bus ?? 'Bus details are still loading'}</p>
      <Link to={`/admin/trips/${trip.id}`} className="focus-ring mt-3 inline-flex text-sm font-medium text-brand">
        View trip
      </Link>
    </article>
  )
}

function namesById(routes: readonly Route[]): Map<string, string> {
  return new Map(routes.map((route) => [route.id, `${route.origin} to ${route.destination}`]))
}

function busLabels(buses: readonly Bus[]): Map<string, string> {
  return new Map(buses.map((bus) => [bus.id, `${bus.registration_number} · ${bus.display_name}`]))
}

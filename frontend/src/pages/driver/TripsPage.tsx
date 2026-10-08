import { useMemo } from 'react'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { TripSummary } from '../../features/driver/TripSummary.tsx'
import { useDriverTripsQuery } from '../../features/driver/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useRoutesById } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import type { RouteDetail } from '../../types/routes.ts'

export function TripsPage() {
  useDocumentTitle('My trips · TravelBus Manager')
  const tripsQuery = useDriverTripsQuery()
  const trips = useMemo(() => tripsQuery.data ?? [], [tripsQuery.data])
  const routeIds = useMemo(() => [...new Set(trips.map((trip) => trip.route_id))], [trips])
  const routeQueries = useRoutesById(routeIds)
  const routes = useMemo(() => {
    const map = new Map<string, RouteDetail>()
    routeIds.forEach((routeId, index) => {
      const route = routeQueries[index]?.data
      if (route) map.set(routeId, route)
    })
    return map
  }, [routeIds, routeQueries])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="My trips" description="Every trip the driver service assigned to this account." />
      {tripsQuery.isPending ? <LoadingSkeleton lines={5} label="Loading assigned trips" /> : null}
      {tripsQuery.isError ? (
        <LoadFailure title="Assigned trips could not be loaded" error={tripsQuery.error} onRetry={() => void tripsQuery.refetch()} />
      ) : null}
      {tripsQuery.data && trips.length === 0 ? (
        <EmptyState title="No assigned trips" description="No trips are assigned to you." />
      ) : null}
      {trips.length > 0 ? (
        <div className="flex flex-col gap-4">
          {trips.map((trip) => (
            <TripSummary key={trip.id} trip={trip} route={routes.get(trip.route_id)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

import { useMemo } from 'react'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { ButtonLink } from '../../components/ui/Button.tsx'
import { TripSummary } from '../../features/driver/TripSummary.tsx'
import { tripsOnLocalDay, useDriverTripsQuery } from '../../features/driver/hooks.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useClock, useRoutesById } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import type { RouteDetail } from '../../types/routes.ts'

export function DashboardPage() {
  useDocumentTitle('Today · TravelBus Manager')
  const tripsQuery = useDriverTripsQuery()
  const now = useClock()
  const today = useMemo(() => tripsOnLocalDay(tripsQuery.data ?? [], now), [now, tripsQuery.data])
  const routeIds = useMemo(() => [...new Set(today.map((trip) => trip.route_id))], [today])
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
      <PageHeader
        title="Today"
        description="Trips assigned to you that depart today."
        actions={
          <ButtonLink to="/driver/trips" variant="secondary">
            All trips
          </ButtonLink>
        }
      />
      {tripsQuery.isPending ? <LoadingSkeleton lines={5} label="Loading assigned trips" /> : null}
      {tripsQuery.isError ? (
        <LoadFailure title="Assigned trips could not be loaded" error={tripsQuery.error} onRetry={() => void tripsQuery.refetch()} />
      ) : null}
      {tripsQuery.data && today.length === 0 ? (
        <EmptyState
          title="No trips today"
          description={
            tripsQuery.data.length > 0
              ? 'None of your assigned trips depart today.'
              : 'No trips are assigned to you.'
          }
          action={
            tripsQuery.data.length > 0 ? (
              <ButtonLink to="/driver/trips" variant="secondary">
                View assigned trips
              </ButtonLink>
            ) : null
          }
        />
      ) : null}
      {today.length > 0 ? (
        <div className="flex flex-col gap-4">
          {today.map((trip) => (
            <TripSummary key={trip.id} trip={trip} route={routes.get(trip.route_id)} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

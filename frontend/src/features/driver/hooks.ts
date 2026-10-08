import { useQuery } from '@tanstack/react-query'
import { listDriverTrips } from '../../api/tracking.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { localDateKey } from '../../lib/format.ts'
import type { DriverTrip } from '../../types/tracking.ts'

export function useDriverTripsQuery() {
  return useQuery({
    queryKey: queryKeys.driverTrips,
    queryFn: listDriverTrips,
  })
}

export function tripsOnLocalDay(trips: readonly DriverTrip[], now: number): DriverTrip[] {
  const today = localDateKey(new Date(now).toISOString())
  if (!today) return []
  return trips.filter((trip) => localDateKey(trip.departure_time) === today)
}

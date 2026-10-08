import type { QueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../api/query-keys.ts'
import { tripStatuses, type TripStatus } from '../../types/common.ts'
import type { TrackingStreamEvent, TripLocation } from '../../types/tracking.ts'

/** A position older than this is shown as stale, matching the tracking copy. */
export const LOCATION_STALE_MS = 3 * 60 * 1000

export function locationAgeMs(recordedAt: string, now: number): number | null {
  const recorded = new Date(recordedAt).getTime()
  if (Number.isNaN(recorded)) return null
  return Math.max(0, now - recorded)
}

export function isLocationStale(recordedAt: string, now: number): boolean {
  const age = locationAgeMs(recordedAt, now)
  return age !== null && age >= LOCATION_STALE_MS
}

export function staleLocationSentence(recordedAt: string, now: number): string {
  const age = locationAgeMs(recordedAt, now) ?? LOCATION_STALE_MS
  const minutes = Math.max(1, Math.floor(age / 60_000))
  const unit = minutes === 1 ? 'minute' : 'minutes'
  return `Location last updated ${minutes} ${unit} ago.`
}

export function applyTrackingEvent(queryClient: QueryClient, tripId: string, event: TrackingStreamEvent): void {
  if ('event' in event || event.trip_id !== tripId) return
  queryClient.setQueryData<TripLocation>(queryKeys.tripLocation(tripId), (current) => {
    if (!current) return current
    const tripStatus = asTripStatus(event.status, current.trip_status)
    if (event.event_type !== 'LOCATION_UPDATED') return { ...current, trip_status: tripStatus }
    return {
      ...current,
      trip_status: tripStatus,
      latest_location: event.location,
      recent_breadcrumbs: [event.location, ...current.recent_breadcrumbs.filter((item) => item.id !== event.location.id)].slice(0, 10),
    }
  })
  void queryClient.invalidateQueries({ queryKey: queryKeys.tripLocation(tripId) })
}

function asTripStatus(status: string, fallback: TripStatus): TripStatus {
  return (tripStatuses as readonly string[]).includes(status) ? (status as TripStatus) : fallback
}

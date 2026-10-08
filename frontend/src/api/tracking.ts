import { env } from '../lib/env.ts'
import { isRecord } from '../lib/is-record.ts'
import type {
  DriverTrip,
  GpsLocation,
  GpsLocationCreate,
  TrackingStreamEvent,
  TripLifecycleResult,
  TripLocation,
} from '../types/tracking.ts'
import { apiRequest } from './client.ts'

export function listDriverTrips(): Promise<DriverTrip[]> {
  return apiRequest<DriverTrip[]>('/api/v1/driver/trips')
}

export function startTrip(tripId: string): Promise<TripLifecycleResult> {
  return apiRequest<TripLifecycleResult>(`/api/v1/driver/trips/${encodeURIComponent(tripId)}/start`, {
    method: 'POST',
  })
}

export function finishTrip(tripId: string): Promise<TripLifecycleResult> {
  return apiRequest<TripLifecycleResult>(`/api/v1/driver/trips/${encodeURIComponent(tripId)}/finish`, {
    method: 'POST',
  })
}

export function recordDriverLocation(tripId: string, body: GpsLocationCreate): Promise<GpsLocation> {
  return apiRequest<GpsLocation>(`/api/v1/driver/trips/${encodeURIComponent(tripId)}/location`, {
    method: 'POST',
    body,
  })
}

export function getTripLocation(tripId: string): Promise<TripLocation> {
  return apiRequest<TripLocation>(`/api/v1/trips/${encodeURIComponent(tripId)}/location`, {
    auth: false,
  })
}

export function trackingEventsUrl(tripId: string): string {
  return `${env.apiBaseUrl}/api/v1/trips/${encodeURIComponent(tripId)}/events/tracking`
}

export function trackingWebSocketUrl(tripId: string): string {
  const socketBase = env.apiBaseUrl.replace(/^http/, 'ws')
  return `${socketBase}/api/v1/trips/${encodeURIComponent(tripId)}/ws/tracking`
}

export function parseTrackingStreamData(data: string): TrackingStreamEvent | null {
  try {
    return parseTrackingStreamEvent(JSON.parse(data) as unknown)
  } catch {
    return null
  }
}

function parseTrackingStreamEvent(value: unknown): TrackingStreamEvent | null {
  if (!isRecord(value)) return null
  if (value.event === 'CONNECTED' && typeof value.trip_id === 'string') {
    return { event: 'CONNECTED', trip_id: value.trip_id }
  }
  if (typeof value.event_type !== 'string' || typeof value.trip_id !== 'string' || typeof value.status !== 'string') {
    return null
  }
  if (value.event_type === 'LOCATION_UPDATED' && isGpsLocation(value.location)) {
    return {
      event_type: 'LOCATION_UPDATED',
      trip_id: value.trip_id,
      status: value.status,
      location: value.location,
    }
  }
  if (value.event_type === 'TRIP_STARTED' || value.event_type === 'TRIP_COMPLETED') {
    return {
      event_type: value.event_type,
      trip_id: value.trip_id,
      status: value.status,
    }
  }
  return null
}

function isGpsLocation(value: unknown): value is GpsLocation {
  if (!isRecord(value)) return false
  return (
    typeof value.id === 'string' &&
    typeof value.trip_id === 'string' &&
    typeof value.latitude === 'number' &&
    typeof value.longitude === 'number' &&
    typeof value.speed_kmph === 'number' &&
    (value.heading === null || typeof value.heading === 'number') &&
    typeof value.recorded_at === 'string' &&
    typeof value.created_at === 'string'
  )
}

import type { AdminTripQuery, PublicTrip, Trip, TripCreateRequest, TripList, TripUpdateRequest } from '../types/trips.ts'
import { apiRequest } from './client.ts'

/**
 * Trip HTTP API.
 * There is no passenger search endpoint. Public detail is GET /api/v1/trips/{trip_id}.
 * Active routes are listed by the routes API. Admin list filters are route_id, bus_id, and status.
 */

export function getPublicTrip(tripId: string): Promise<PublicTrip> {
  return apiRequest<PublicTrip>(`/api/v1/trips/${encodeURIComponent(tripId)}`, { auth: false })
}

export function listAdminTrips(query: AdminTripQuery = {}): Promise<TripList> {
  return apiRequest<TripList>('/api/v1/admin/trips', { query })
}

export function getAdminTrip(tripId: string): Promise<Trip> {
  return apiRequest<Trip>(`/api/v1/admin/trips/${encodeURIComponent(tripId)}`)
}

export function createTrip(body: TripCreateRequest): Promise<Trip> {
  return apiRequest<Trip>('/api/v1/admin/trips', { method: 'POST', body })
}

export function updateTrip(tripId: string, body: TripUpdateRequest): Promise<Trip> {
  return apiRequest<Trip>(`/api/v1/admin/trips/${encodeURIComponent(tripId)}`, {
    method: 'PATCH',
    body,
  })
}

export function cancelTrip(tripId: string): Promise<Trip> {
  return apiRequest<Trip>(`/api/v1/admin/trips/${encodeURIComponent(tripId)}/cancel`, {
    method: 'POST',
  })
}

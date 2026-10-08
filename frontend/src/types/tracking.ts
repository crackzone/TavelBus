import type { TripStatus } from './common.ts'

export type GpsLocationCreate = {
  latitude: number
  longitude: number
  speed_kmph?: number
  heading?: number | null
  recorded_at: string
}

export type GpsLocation = {
  id: string
  trip_id: string
  latitude: number
  longitude: number
  speed_kmph: number
  heading: number | null
  recorded_at: string
  created_at: string
}

export type NextStopEta = {
  stop_id: string
  stop_name: string
  sequence_number: number
  distance_km: number
  estimated_minutes_away: number | null
}

export type TripLocation = {
  trip_id: string
  trip_status: TripStatus
  latest_location: GpsLocation | null
  next_stop: NextStopEta | null
  recent_breadcrumbs: GpsLocation[]
}

export type DriverTrip = {
  id: string
  route_id: string
  bus_id: string
  departure_time: string
  arrival_time: string
  fare: number
  status: TripStatus
}

export type TripLifecycleResult = {
  message: string
  trip_id: string
  status: TripStatus
}

export type TrackingLocationEvent = {
  event_type: 'LOCATION_UPDATED'
  trip_id: string
  status: string
  location: GpsLocation
}

export type TrackingLifecycleEvent = {
  event_type: 'TRIP_STARTED' | 'TRIP_COMPLETED'
  trip_id: string
  status: string
}

export type TrackingConnectedEvent = {
  event: 'CONNECTED'
  trip_id: string
}

export type TrackingStreamEvent = TrackingLocationEvent | TrackingLifecycleEvent | TrackingConnectedEvent

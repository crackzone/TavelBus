import type { BookingStatus, TripStatus } from './common.ts'

export type RevenueSummary = {
  gross_revenue: number
  refunded_revenue: number
  net_revenue: number
  total_bookings: number
  confirmed_bookings: number
  cancelled_bookings: number
  total_seats_sold: number
  average_booking_value: number
}

export type RouteRevenue = {
  route_id: string
  route_name: string
  origin: string
  destination: string
  total_trips: number
  confirmed_bookings: number
  net_revenue: number
}

export type BusRevenue = {
  bus_id: string
  registration_number: string
  display_name: string
  total_trips: number
  confirmed_bookings: number
  net_revenue: number
}

export type ManifestPassenger = {
  booking_id: string
  seat_id: string
  seat_number: number
  passenger_id: string
  passenger_name: string
  passenger_email: string
  passenger_phone: string | null
  booking_status: BookingStatus
  fare_paid: number
  booked_at: string
}

export type TripManifest = {
  trip_id: string
  route_name: string
  bus_registration: string
  departure_time: string
  arrival_time: string
  trip_status: TripStatus
  seat_capacity: number
  seats_booked: number
  occupancy_rate_pct: number
  trip_gross_revenue: number
  passengers: ManifestPassenger[]
}

export type RevenueQuery = {
  start_date?: string
  end_date?: string
}

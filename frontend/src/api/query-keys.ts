import type { AdminBookingQuery } from '../types/bookings.ts'
import type { BusStatus } from '../types/common.ts'
import type { RevenueQuery } from '../types/revenue.ts'
import type { AdminTripQuery } from '../types/trips.ts'

export const queryKeys = {
  me: ['auth', 'me'] as const,
  health: ['health'] as const,
  readiness: ['ready'] as const,
  publicRoutes: ['routes', 'public'] as const,
  adminRoutes: ['routes', 'admin'] as const,
  adminRoute: (routeId: string) => ['routes', 'admin', routeId] as const,
  route: (routeId: string) => ['routes', routeId] as const,
  routeStops: (routeId: string) => ['routes', routeId, 'stops'] as const,
  publicTrip: (tripId: string) => ['trips', 'public', tripId] as const,
  adminTrips: (filters: AdminTripQuery) => ['trips', 'admin', filters] as const,
  adminTrip: (tripId: string) => ['trips', 'admin', tripId] as const,
  tripSeats: (tripId: string) => ['trips', tripId, 'seats'] as const,
  myBookings: ['bookings', 'mine'] as const,
  booking: (bookingId: string) => ['bookings', bookingId] as const,
  adminBookings: (filters: AdminBookingQuery) => ['bookings', 'admin', filters] as const,
  buses: (status?: BusStatus) => ['buses', status ?? 'all'] as const,
  bus: (busId: string) => ['buses', busId] as const,
  driverTrips: ['driver', 'trips'] as const,
  tripLocation: (tripId: string) => ['tracking', tripId] as const,
  revenueSummary: (filters: RevenueQuery) => ['revenue', 'summary', filters] as const,
  revenueByRoute: ['revenue', 'by-route'] as const,
  revenueByBus: ['revenue', 'by-bus'] as const,
  manifest: (tripId: string) => ['manifest', tripId] as const,
}

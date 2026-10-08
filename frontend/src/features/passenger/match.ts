import type { Booking } from '../../types/bookings.ts'
import type { PublicTrip } from '../../types/trips.ts'
import type { Route } from '../../types/routes.ts'
import { localDateKey } from '../../lib/format.ts'

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isTripReference(value: string): boolean {
  return uuidPattern.test(value.trim())
}

export function normalizePlace(value: string): string {
  return value.trim().toLocaleLowerCase()
}

export function matchingRoutes(routes: readonly Route[], from: string, to: string): Route[] {
  const origin = normalizePlace(from)
  const destination = normalizePlace(to)
  return routes.filter(
    (route) =>
      route.is_active && normalizePlace(route.origin) === origin && normalizePlace(route.destination) === destination,
  )
}

export function placeNames(routes: readonly Route[], field: 'origin' | 'destination', from?: string): string[] {
  const scoped = from
    ? routes.filter((route) => normalizePlace(route.origin) === normalizePlace(from))
    : routes
  return [...new Set(scoped.map((route) => route[field]))].sort((left, right) => left.localeCompare(right))
}

export function tripMatchesSearch(trip: PublicTrip, routes: readonly Route[], travelDate: string): Route | null {
  const route = routes.find((item) => item.id === trip.route_id)
  if (!route) return null
  if (localDateKey(trip.departure_time) !== travelDate) return null
  return route
}

export function nextUpcoming(bookings: readonly Booking[], trips: ReadonlyMap<string, PublicTrip>, now = Date.now()): Booking | null {
  const upcoming = bookings
    .filter((booking) => booking.status === 'CONFIRMED')
    .map((booking) => ({ booking, trip: trips.get(booking.trip_id) }))
    .filter((item): item is { booking: Booking; trip: PublicTrip } => {
      if (!item.trip) return false
      const departure = new Date(item.trip.departure_time).getTime()
      return !Number.isNaN(departure) && departure > now
    })
    .sort((left, right) => new Date(left.trip.departure_time).getTime() - new Date(right.trip.departure_time).getTime())
  return upcoming[0]?.booking ?? null
}

export function bookingBlockReason(trip: PublicTrip, now = Date.now()): string | null {
  if (trip.status !== 'SCHEDULED') return 'This trip is not open for booking.'
  const departure = new Date(trip.departure_time).getTime()
  if (!Number.isNaN(departure) && departure <= now) return 'This trip has already departed.'
  return null
}

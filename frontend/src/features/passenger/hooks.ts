import { useQueries, useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { listMyBookings, getBooking, getTripSeats } from '../../api/bookings.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { getPublicRoute, listPublicRoutes } from '../../api/routes.ts'
import { getTripLocation } from '../../api/tracking.ts'
import { getPublicTrip } from '../../api/trips.ts'

export function useClock(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs])
  return now
}

export function usePublicRoutesQuery() {
  return useQuery({
    queryKey: queryKeys.publicRoutes,
    queryFn: listPublicRoutes,
  })
}

export function usePublicTripQuery(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.publicTrip(tripId ?? 'missing'),
    queryFn: () => getPublicTrip(tripId ?? ''),
    enabled: Boolean(tripId),
  })
}

export function usePublicRouteQuery(routeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.route(routeId ?? 'missing'),
    queryFn: () => getPublicRoute(routeId ?? ''),
    enabled: Boolean(routeId),
  })
}

export function useTripSeatsQuery(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripSeats(tripId ?? 'missing'),
    queryFn: () => getTripSeats(tripId ?? ''),
    enabled: Boolean(tripId),
  })
}

export function useMyBookingsQuery() {
  return useQuery({
    queryKey: queryKeys.myBookings,
    queryFn: listMyBookings,
  })
}

export function useTripLocationQuery(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.tripLocation(tripId ?? 'missing'),
    queryFn: () => getTripLocation(tripId ?? ''),
    enabled: Boolean(tripId),
  })
}

export function useBookingQuery(bookingId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.booking(bookingId ?? 'missing'),
    queryFn: () => getBooking(bookingId ?? ''),
    enabled: Boolean(bookingId),
  })
}

export function useTripsById(tripIds: readonly string[]) {
  return useQueries({
    queries: tripIds.map((tripId) => ({
      queryKey: queryKeys.publicTrip(tripId),
      queryFn: () => getPublicTrip(tripId),
    })),
  })
}

export function useRoutesById(routeIds: readonly string[]) {
  return useQueries({
    queries: routeIds.map((routeId) => ({
      queryKey: queryKeys.route(routeId),
      queryFn: () => getPublicRoute(routeId),
    })),
  })
}

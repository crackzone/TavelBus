import { useQuery } from '@tanstack/react-query'
import { listAdminBookings } from '../../api/bookings.ts'
import { listBuses, getBus } from '../../api/buses.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { getRevenueByBus, getRevenueByRoute, getRevenueSummary, getTripManifest } from '../../api/revenue.ts'
import { getAdminRoute, listAdminRoutes } from '../../api/routes.ts'
import { getAdminTrip, listAdminTrips } from '../../api/trips.ts'
import type { AdminBookingQuery } from '../../types/bookings.ts'
import type { BusStatus } from '../../types/common.ts'
import type { RevenueQuery } from '../../types/revenue.ts'
import type { AdminTripQuery } from '../../types/trips.ts'

export function useBusesQuery(status?: BusStatus) {
  return useQuery({
    queryKey: queryKeys.buses(status),
    queryFn: () => listBuses(status),
  })
}

export function useBusQuery(busId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.bus(busId ?? 'missing'),
    queryFn: () => getBus(busId ?? ''),
    enabled: Boolean(busId),
  })
}

export function useAdminRoutesQuery() {
  return useQuery({
    queryKey: queryKeys.adminRoutes,
    queryFn: listAdminRoutes,
  })
}

export function useAdminRouteQuery(routeId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminRoute(routeId ?? 'missing'),
    queryFn: () => getAdminRoute(routeId ?? ''),
    enabled: Boolean(routeId),
  })
}

export function useAdminTripsQuery(filters: AdminTripQuery) {
  return useQuery({
    queryKey: queryKeys.adminTrips(filters),
    queryFn: () => listAdminTrips(filters),
  })
}

export function useRunningTripsQuery() {
  const filters: AdminTripQuery = { status: 'IN_PROGRESS' }
  return useQuery({
    queryKey: queryKeys.adminTrips(filters),
    queryFn: () => listAdminTrips(filters),
    refetchInterval: 30_000,
  })
}

export function useAdminTripQuery(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.adminTrip(tripId ?? 'missing'),
    queryFn: () => getAdminTrip(tripId ?? ''),
    enabled: Boolean(tripId),
  })
}

export function useAdminBookingsQuery(filters: AdminBookingQuery) {
  return useQuery({
    queryKey: queryKeys.adminBookings(filters),
    queryFn: () => listAdminBookings(filters),
  })
}

export function useRevenueSummaryQuery(filters: RevenueQuery, enabled = true) {
  return useQuery({
    queryKey: queryKeys.revenueSummary(filters),
    queryFn: () => getRevenueSummary(filters),
    enabled,
  })
}

export function useRevenueByRouteQuery() {
  return useQuery({
    queryKey: queryKeys.revenueByRoute,
    queryFn: getRevenueByRoute,
  })
}

export function useRevenueByBusQuery() {
  return useQuery({
    queryKey: queryKeys.revenueByBus,
    queryFn: getRevenueByBus,
  })
}

export function useManifestQuery(tripId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.manifest(tripId ?? 'missing'),
    queryFn: () => getTripManifest(tripId ?? ''),
    enabled: Boolean(tripId),
  })
}

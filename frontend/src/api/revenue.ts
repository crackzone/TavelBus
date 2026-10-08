import { ApiError } from '../lib/api-error.ts'
import { isRecord } from '../lib/is-record.ts'
import type { BusRevenue, RevenueQuery, RevenueSummary, RouteRevenue, TripManifest } from '../types/revenue.ts'
import { apiRequest } from './client.ts'

const DECIMAL = /^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$/

export async function getRevenueSummary(query: RevenueQuery = {}): Promise<RevenueSummary> {
  const payload = await apiRequest<unknown>('/api/v1/admin/revenue/summary', { query })
  const body = readRecord(payload, 'summary')
  return {
    gross_revenue: readMoney(body.gross_revenue, 'gross revenue'),
    refunded_revenue: readMoney(body.refunded_revenue, 'refunded revenue'),
    net_revenue: readMoney(body.net_revenue, 'net revenue'),
    total_bookings: readCount(body.total_bookings, 'total bookings'),
    confirmed_bookings: readCount(body.confirmed_bookings, 'confirmed bookings'),
    cancelled_bookings: readCount(body.cancelled_bookings, 'cancelled bookings'),
    total_seats_sold: readCount(body.total_seats_sold, 'seats sold'),
    average_booking_value: readMoney(body.average_booking_value, 'average booking value'),
  }
}

export async function getRevenueByRoute(): Promise<RouteRevenue[]> {
  const payload = await apiRequest<unknown>('/api/v1/admin/revenue/by-route')
  return readList(payload, 'route revenue').map((item) => ({
    route_id: readText(item.route_id, 'route id'),
    route_name: readText(item.route_name, 'route name'),
    origin: readText(item.origin, 'origin'),
    destination: readText(item.destination, 'destination'),
    total_trips: readCount(item.total_trips, 'route trips'),
    confirmed_bookings: readCount(item.confirmed_bookings, 'route bookings'),
    net_revenue: readMoney(item.net_revenue, 'route net revenue'),
  }))
}

export async function getRevenueByBus(): Promise<BusRevenue[]> {
  const payload = await apiRequest<unknown>('/api/v1/admin/revenue/by-bus')
  return readList(payload, 'bus revenue').map((item) => ({
    bus_id: readText(item.bus_id, 'bus id'),
    registration_number: readText(item.registration_number, 'registration number'),
    display_name: readText(item.display_name, 'display name'),
    total_trips: readCount(item.total_trips, 'bus trips'),
    confirmed_bookings: readCount(item.confirmed_bookings, 'bus bookings'),
    net_revenue: readMoney(item.net_revenue, 'bus net revenue'),
  }))
}

export function getTripManifest(tripId: string): Promise<TripManifest> {
  return apiRequest<TripManifest>(`/api/v1/admin/trips/${encodeURIComponent(tripId)}/manifest`)
}

function readList(payload: unknown, label: string): Record<string, unknown>[] {
  if (!Array.isArray(payload)) throw shapeError(label)
  return payload.map((item) => readRecord(item, label))
}

function readRecord(payload: unknown, label: string): Record<string, unknown> {
  if (!isRecord(payload)) throw shapeError(label)
  return payload
}

function readText(value: unknown, field: string): string {
  if (typeof value === 'string' && value.trim() !== '') return value
  throw shapeError(field)
}

function readCount(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 0) return value
  throw shapeError(field)
}

function readMoney(value: unknown, field: string): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && DECIMAL.test(value)) {
    const amount = Number(value)
    if (Number.isFinite(amount)) return amount
  }
  throw shapeError(field)
}

function shapeError(field: string): ApiError {
  return new ApiError({
    status: 422,
    code: 'RESPONSE_SHAPE',
    requestId: '',
    details: null,
    userMessage: `The revenue response did not include a readable ${field}.`,
  })
}

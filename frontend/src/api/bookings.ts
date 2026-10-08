import type {
  AdminBookingQuery,
  Booking,
  BookingCancelResult,
  BookingCreateRequest,
  BookingList,
  TripSeat,
} from '../types/bookings.ts'
import { apiRequest } from './client.ts'

export function getTripSeats(tripId: string): Promise<TripSeat[]> {
  return apiRequest<TripSeat[]>(`/api/v1/trips/${encodeURIComponent(tripId)}/seats`, { auth: false })
}

export function createBooking(body: BookingCreateRequest, idempotencyKey?: string): Promise<Booking> {
  return apiRequest<Booking>('/api/v1/bookings', {
    method: 'POST',
    body,
    idempotencyKey,
  })
}

export function listMyBookings(): Promise<BookingList> {
  return apiRequest<BookingList>('/api/v1/bookings')
}

export function getBooking(bookingId: string): Promise<Booking> {
  return apiRequest<Booking>(`/api/v1/bookings/${encodeURIComponent(bookingId)}`)
}

export function cancelBooking(bookingId: string): Promise<BookingCancelResult> {
  return apiRequest<BookingCancelResult>(`/api/v1/bookings/${encodeURIComponent(bookingId)}/cancel`, {
    method: 'POST',
  })
}

export function listAdminBookings(query: AdminBookingQuery = {}): Promise<BookingList> {
  return apiRequest<BookingList>('/api/v1/admin/bookings', { query })
}

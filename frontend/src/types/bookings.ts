import type { BookingStatus, ListResponse, PaymentStatus, SeatStatus } from './common.ts'

export type TripSeat = {
  id: string
  trip_id: string
  seat_number: number
  status: SeatStatus
}

export type Booking = {
  id: string
  booking_reference: string
  user_id: string
  trip_id: string
  trip_seat_id: string
  seat_number: number
  amount: number
  status: BookingStatus
  payment_status: PaymentStatus
  created_at: string
  cancelled_at: string | null
}

export type BookingCreateRequest = {
  trip_id: string
  seat_number: number
}

export type BookingCancelResult = {
  booking_reference: string
  status: BookingStatus
  refund_status: string
  cancelled_at: string
}

export type AdminBookingQuery = {
  trip_id?: string
  status?: BookingStatus
}

export type BookingList = ListResponse<Booking>

export const userRoles = ['PASSENGER', 'DRIVER', 'ADMIN'] as const
export type UserRole = (typeof userRoles)[number]

export const tripStatuses = ['SCHEDULED', 'BOARDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const
export type TripStatus = (typeof tripStatuses)[number]

export const busStatuses = ['ACTIVE', 'INACTIVE', 'MAINTENANCE'] as const
export type BusStatus = (typeof busStatuses)[number]

export const seatStatuses = ['AVAILABLE', 'LOCKED', 'BOOKED'] as const
export type SeatStatus = (typeof seatStatuses)[number]

export const bookingStatuses = ['CONFIRMED', 'CANCELLED', 'COMPLETED'] as const
export type BookingStatus = (typeof bookingStatuses)[number]

export const paymentStatuses = ['PENDING', 'PAID', 'REFUNDED', 'FAILED'] as const
export type PaymentStatus = (typeof paymentStatuses)[number]

export const connectionStates = ['CONNECTED', 'CONNECTING', 'RECONNECTING', 'DISCONNECTED', 'STALE'] as const
export type ConnectionState = (typeof connectionStates)[number]

export const agentActionTypes = ['BOOK_TICKET', 'CANCEL_BOOKING'] as const
export type AgentActionType = (typeof agentActionTypes)[number]

export type ListResponse<T> = {
  items: T[]
  total: number
}

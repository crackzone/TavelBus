import type { ListResponse, TripStatus } from './common.ts'

export type Trip = {
  id: string
  route_id: string
  bus_id: string
  driver_id: string | null
  departure_time: string
  arrival_time: string
  fare: number
  status: TripStatus
  created_at: string
  updated_at: string
}

export type PublicTrip = {
  id: string
  route_id: string
  departure_time: string
  arrival_time: string
  fare: number
  status: TripStatus
}

export type TripCreateRequest = {
  route_id: string
  bus_id: string
  driver_id?: string | null
  departure_time: string
  arrival_time: string
  fare: number
  status?: TripStatus
}

export type TripUpdateRequest = {
  bus_id?: string | null
  driver_id?: string | null
  departure_time?: string | null
  arrival_time?: string | null
  fare?: number | null
  status?: TripStatus | null
}

export type AdminTripQuery = {
  route_id?: string
  bus_id?: string
  status?: TripStatus
}

export type TripList = ListResponse<Trip>

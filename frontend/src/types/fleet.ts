import type { BusStatus, ListResponse } from './common.ts'

export type Bus = {
  id: string
  registration_number: string
  display_name: string
  seat_capacity: number
  status: BusStatus
  created_at: string
  updated_at: string
}

export type BusCreateRequest = {
  registration_number: string
  display_name: string
  seat_capacity: number
  status?: BusStatus
}

export type BusUpdateRequest = {
  display_name?: string | null
  seat_capacity?: number | null
  status?: BusStatus | null
}

export type BusList = ListResponse<Bus>

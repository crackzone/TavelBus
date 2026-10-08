import type { ListResponse } from './common.ts'

export type Stop = {
  id: string
  route_id: string
  name: string
  sequence_number: number
  latitude: number
  longitude: number
  created_at: string
  updated_at: string
}

export type StopCreateRequest = {
  name: string
  sequence_number: number
  latitude: number
  longitude: number
}

export type StopUpdateRequest = {
  name?: string | null
  sequence_number?: number | null
  latitude?: number | null
  longitude?: number | null
}

export type Route = {
  id: string
  name: string
  origin: string
  destination: string
  distance_km: number | null
  estimated_duration_minutes: number | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type RouteDetail = Route & {
  stops: Stop[]
}

export type RouteCreateRequest = {
  name: string
  origin: string
  destination: string
  distance_km?: number | null
  estimated_duration_minutes?: number | null
  is_active?: boolean
}

export type RouteUpdateRequest = {
  name?: string | null
  origin?: string | null
  destination?: string | null
  distance_km?: number | null
  estimated_duration_minutes?: number | null
  is_active?: boolean | null
}

export type RouteList = ListResponse<Route>

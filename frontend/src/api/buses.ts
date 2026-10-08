import type { Bus, BusCreateRequest, BusList, BusUpdateRequest } from '../types/fleet.ts'
import type { BusStatus } from '../types/common.ts'
import { apiRequest } from './client.ts'

export function listBuses(status?: BusStatus): Promise<BusList> {
  return apiRequest<BusList>('/api/v1/admin/buses', { query: { status } })
}

export function getBus(busId: string): Promise<Bus> {
  return apiRequest<Bus>(`/api/v1/admin/buses/${encodeURIComponent(busId)}`)
}

export function createBus(body: BusCreateRequest): Promise<Bus> {
  return apiRequest<Bus>('/api/v1/admin/buses', { method: 'POST', body })
}

export function updateBus(busId: string, body: BusUpdateRequest): Promise<Bus> {
  return apiRequest<Bus>(`/api/v1/admin/buses/${encodeURIComponent(busId)}`, {
    method: 'PATCH',
    body,
  })
}

export function deactivateBus(busId: string): Promise<Bus> {
  return apiRequest<Bus>(`/api/v1/admin/buses/${encodeURIComponent(busId)}/deactivate`, {
    method: 'POST',
  })
}

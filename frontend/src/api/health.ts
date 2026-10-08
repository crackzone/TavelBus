import type { HealthResponse, ReadinessResponse } from '../types/health.ts'
import { apiRequest } from './client.ts'

export function getHealth(): Promise<HealthResponse> {
  return apiRequest<HealthResponse>('/health', { auth: false })
}

export function getReadiness(): Promise<ReadinessResponse> {
  return apiRequest<ReadinessResponse>('/ready', { auth: false })
}

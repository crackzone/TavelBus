import type { HealthResponse } from '../types/health.ts'

type MockResult = { handled: true; body: unknown } | { handled: false }

const handlers = new Map<string, () => unknown>([
  [
    'GET /health',
    (): HealthResponse => ({
      status: 'healthy',
      service: 'TravelBus Manager',
      version: 'mock',
      environment: 'mock',
    }),
  ],
])

/**
 * Mock mode is isolated from the network.
 * Only the liveness probe has a handler. Bookings, revenue, and GPS stay unimplemented.
 */
export function runMock(method: string, path: string): MockResult {
  const handler = handlers.get(`${method} ${path}`)
  if (!handler) return { handled: false }
  return { handled: true, body: handler() }
}

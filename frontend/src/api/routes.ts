import type {
  Route,
  RouteCreateRequest,
  RouteDetail,
  RouteList,
  RouteUpdateRequest,
  Stop,
  StopCreateRequest,
  StopUpdateRequest,
} from '../types/routes.ts'
import { apiRequest } from './client.ts'

export function listPublicRoutes(): Promise<RouteList> {
  return apiRequest<RouteList>('/api/v1/routes', { auth: false })
}

export function getPublicRoute(routeId: string): Promise<RouteDetail> {
  return apiRequest<RouteDetail>(`/api/v1/routes/${encodeURIComponent(routeId)}`, { auth: false })
}

export function listPublicStops(routeId: string): Promise<Stop[]> {
  return apiRequest<Stop[]>(`/api/v1/routes/${encodeURIComponent(routeId)}/stops`, { auth: false })
}

export function listAdminRoutes(): Promise<RouteList> {
  return apiRequest<RouteList>('/api/v1/admin/routes')
}

export function getAdminRoute(routeId: string): Promise<RouteDetail> {
  return apiRequest<RouteDetail>(`/api/v1/admin/routes/${encodeURIComponent(routeId)}`)
}

export function createRoute(body: RouteCreateRequest): Promise<Route> {
  return apiRequest<Route>('/api/v1/admin/routes', { method: 'POST', body })
}

export function updateRoute(routeId: string, body: RouteUpdateRequest): Promise<Route> {
  return apiRequest<Route>(`/api/v1/admin/routes/${encodeURIComponent(routeId)}`, {
    method: 'PATCH',
    body,
  })
}

export function deactivateRoute(routeId: string): Promise<Route> {
  return apiRequest<Route>(`/api/v1/admin/routes/${encodeURIComponent(routeId)}/deactivate`, {
    method: 'POST',
  })
}

export function reactivateRoute(routeId: string): Promise<Route> {
  return apiRequest<Route>(`/api/v1/admin/routes/${encodeURIComponent(routeId)}/reactivate`, {
    method: 'POST',
  })
}

export function createStop(routeId: string, body: StopCreateRequest): Promise<Stop> {
  return apiRequest<Stop>(`/api/v1/admin/routes/${encodeURIComponent(routeId)}/stops`, {
    method: 'POST',
    body,
  })
}

export function listAdminStops(routeId: string): Promise<Stop[]> {
  return apiRequest<Stop[]>(`/api/v1/admin/routes/${encodeURIComponent(routeId)}/stops`)
}

export function updateStop(stopId: string, body: StopUpdateRequest): Promise<Stop> {
  return apiRequest<Stop>(`/api/v1/admin/stops/${encodeURIComponent(stopId)}`, {
    method: 'PATCH',
    body,
  })
}

export function deleteStop(stopId: string): Promise<void> {
  return apiRequest<void>(`/api/v1/admin/stops/${encodeURIComponent(stopId)}`, { method: 'DELETE' })
}

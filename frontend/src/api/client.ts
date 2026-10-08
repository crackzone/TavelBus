import { ApiError, toApiError } from '../lib/api-error.ts'
import { env } from '../lib/env.ts'
import { clearAccessToken, getAccessToken } from '../lib/token-store.ts'
import { runMock } from './mock.ts'

export type QueryValue = string | number | boolean | null | undefined

export type QueryParams = Record<string, QueryValue>

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE'

export type RequestOptions = {
  method?: HttpMethod
  body?: unknown
  query?: object
  headers?: HeadersInit
  idempotencyKey?: string
  auth?: boolean
  signal?: AbortSignal
}

type UnauthorizedHandler = (error: ApiError) => void

let unauthorizedHandler: UnauthorizedHandler | null = null

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? 'GET'
  const requestId = crypto.randomUUID()
  const url = new URL(path, `${env.apiBaseUrl}/`)
  appendQuery(url, options.query)

  if (env.useMockApi) {
    const mocked = runMock(method, url.pathname)
    if (!mocked.handled) {
      throw new ApiError({
        status: 501,
        code: 'MOCK_NOT_IMPLEMENTED',
        requestId,
        details: null,
        userMessage: 'Mock API is enabled, and this operation does not have a mock handler.',
      })
    }
    return mocked.body as T
  }

  const token = options.auth === false ? null : getAccessToken()
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')
  headers.set('X-Request-ID', requestId)
  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (options.idempotencyKey) headers.set('Idempotency-Key', options.idempotencyKey)
  if (token) headers.set('Authorization', `Bearer ${token}`)

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      credentials: 'omit',
      cache: 'no-store',
      signal: options.signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError({
      status: 0,
      code: 'NETWORK_ERROR',
      requestId,
      details: null,
      userMessage: 'The network request failed. Check your connection and try again.',
    })
  }

  const payload = await readPayload(response)
  const echoedRequestId = response.headers.get('X-Request-ID') ?? requestId
  if (!response.ok) {
    const error = toApiError(response.status, payload, echoedRequestId)
    if (response.status === 401 && token) {
      clearAccessToken()
      unauthorizedHandler?.(error)
    }
    throw error
  }

  return payload as T
}

function appendQuery(url: URL, query: object | undefined): void {
  if (!query) return
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue
    url.searchParams.set(key, String(value))
  }
}

async function readPayload(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined
  const text = await response.text()
  if (text.trim() === '') return undefined
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

import { isRecord } from '../../lib/is-record.ts'
import type { ChatMessageKind } from '../../components/common/ChatMessage.tsx'
import type { ChatResponse } from '../../types/assistant.ts'

export type AssistantBooking = {
  reference: string
  status: string
  seat: string
}

export type AssistantTrip = {
  tripId: string
  route: string
  fare: number | null
}

export type AssistantLocation = {
  tripId: string | null
  status: string | null
  latitude: number | null
  longitude: number | null
  speedKmph: number | null
}

export type TranscriptItem = {
  id: string
  role: 'user' | 'assistant'
  text: string
  kind: ChatMessageKind
  bookings?: AssistantBooking[]
  trips?: AssistantTrip[]
  location?: AssistantLocation
}

const KINDS: Record<string, ChatMessageKind> = {
  POLICY_QUERY: 'policy',
  BOOKING_STATUS: 'verified',
  TRIP_SEARCH: 'verified',
  BUS_LOCATION: 'tracking',
  GENERAL_QA: 'assistant',
}

const DECIMAL = /^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$/

export const suggestedPrompts = [
  'Find buses from Bengaluru to Mysuru tomorrow.',
  'Where is my bus?',
  'What is the baggage allowance?',
  'What is my booking status?',
] as const

export function userTurn(text: string): TranscriptItem {
  return { id: crypto.randomUUID(), role: 'user', text, kind: 'user' }
}

export function assistantTurn(data: ChatResponse): TranscriptItem {
  const context = isRecord(data.data_context) ? data.data_context : null
  const kind = KINDS[data.intent] ?? 'assistant'
  return {
    id: crypto.randomUUID(),
    role: 'assistant',
    text: data.response,
    kind,
    bookings: kind === 'verified' && data.intent === 'BOOKING_STATUS' ? readBookings(context) : undefined,
    trips: kind === 'verified' && data.intent === 'TRIP_SEARCH' ? readTrips(context) : undefined,
    location: kind === 'tracking' ? readLocation(context) : undefined,
  }
}

export function storageKey(audience: 'passenger' | 'admin'): string {
  return `travelbus.assistant.${audience}`
}

export function loadTranscript(audience: 'passenger' | 'admin'): TranscriptItem[] {
  try {
    const raw = sessionStorage.getItem(storageKey(audience))
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isTranscriptItem)
  } catch {
    return []
  }
}

export function saveTranscript(audience: 'passenger' | 'admin', items: readonly TranscriptItem[]): void {
  sessionStorage.setItem(storageKey(audience), JSON.stringify(items))
}

export function clearTranscript(audience: 'passenger' | 'admin'): void {
  sessionStorage.removeItem(storageKey(audience))
}

function readBookings(context: Record<string, unknown> | null): AssistantBooking[] | undefined {
  if (!context || !Array.isArray(context.bookings)) return undefined
  const rows: AssistantBooking[] = []
  for (const item of context.bookings) {
    if (!isRecord(item) || typeof item.reference !== 'string' || typeof item.status !== 'string') continue
    const seat = readSeat(item.seat_number)
    if (!seat) continue
    rows.push({ reference: item.reference, status: item.status, seat })
  }
  return rows
}

function readTrips(context: Record<string, unknown> | null): AssistantTrip[] | undefined {
  if (!context || !Array.isArray(context.trips)) return undefined
  const rows: AssistantTrip[] = []
  for (const item of context.trips) {
    if (!isRecord(item) || typeof item.trip_id !== 'string' || typeof item.route !== 'string') continue
    rows.push({ tripId: item.trip_id, route: item.route, fare: readMoney(item.fare) })
  }
  return rows
}

function readLocation(context: Record<string, unknown> | null): AssistantLocation | undefined {
  if (!context) return undefined
  return {
    tripId: typeof context.trip_id === 'string' ? context.trip_id : null,
    status: typeof context.status === 'string' ? context.status : null,
    latitude: readFinite(context.latitude),
    longitude: readFinite(context.longitude),
    speedKmph: readFinite(context.speed_kmph),
  }
}

function readSeat(value: unknown): string | null {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) return String(value).padStart(2, '0')
  if (typeof value === 'string' && value.trim() !== '') return value
  return null
}

function readMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && DECIMAL.test(value)) {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount : null
  }
  return null
}

function readFinite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const messageKinds = new Set<ChatMessageKind>(['user', 'assistant', 'verified', 'tracking', 'policy', 'proposal'])

function isTranscriptItem(value: unknown): value is TranscriptItem {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && (value.role === 'user' || value.role === 'assistant') && typeof value.text === 'string' && isKind(value.kind)
}

function isKind(value: unknown): value is ChatMessageKind {
  return typeof value === 'string' && messageKinds.has(value as ChatMessageKind)
}

import { isTripReference } from '../passenger/match.ts'

export function driverLabel(driverId: string | null): string {
  return driverId ?? 'Not assigned'
}

export function parseOptionalUuid(value: string): { id?: string; error?: string } {
  const trimmed = value.trim()
  if (!trimmed) return {}
  if (!isTripReference(trimmed)) return { error: 'Enter a driver account id. It is a UUID.' }
  return { id: trimmed }
}

export function toApiDateTime(localValue: string): string | null {
  if (!localValue) return null
  const date = new Date(localValue)
  if (Number.isNaN(date.getTime())) return null
  return date.toISOString()
}

export function localDayBound(date: string, end: boolean): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const parsed = new Date(`${date}T${end ? '23:59:59.999' : '00:00:00'}`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

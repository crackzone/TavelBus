import type { BadgeTone } from './Badge.tsx'
import { Badge } from './Badge.tsx'

const STATUS_META: Record<string, { label: string; tone: BadgeTone }> = {
  SCHEDULED: { label: 'Scheduled', tone: 'info' },
  BOARDING: { label: 'Boarding', tone: 'warning' },
  IN_PROGRESS: { label: 'In progress', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'neutral' },
  CANCELLED: { label: 'Cancelled', tone: 'danger' },
  ACTIVE: { label: 'Active', tone: 'success' },
  MAINTENANCE: { label: 'Maintenance', tone: 'warning' },
  INACTIVE: { label: 'Inactive', tone: 'neutral' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  PAID: { label: 'Paid', tone: 'success' },
  REFUNDED: { label: 'Refunded', tone: 'warning' },
  PENDING: { label: 'Pending', tone: 'warning' },
  FAILED: { label: 'Failed', tone: 'danger' },
  AVAILABLE: { label: 'Available', tone: 'success' },
  BOOKED: { label: 'Booked', tone: 'neutral' },
  LOCKED: { label: 'Held', tone: 'warning' },
  SELECTED: { label: 'Selected', tone: 'info' },
  CONNECTED: { label: 'Live', tone: 'success' },
  CONNECTING: { label: 'Connecting', tone: 'info' },
  RECONNECTING: { label: 'Reconnecting', tone: 'warning' },
  DISCONNECTED: { label: 'Offline', tone: 'danger' },
  STALE: { label: 'Stale', tone: 'warning' },
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status]
  const label = meta?.label ?? humanize(status)
  const tone = meta?.tone ?? 'neutral'
  return (
    <Badge tone={tone}>
      <span className="sr-only">Status: </span>
      {label}
    </Badge>
  )
}

function humanize(status: string): string {
  const lower = status.replaceAll('_', ' ').toLowerCase()
  const first = lower[0]
  if (!first) return status
  return first.toUpperCase() + lower.slice(1)
}

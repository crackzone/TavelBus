import type { ConnectionState } from '../../types/common.ts'
import { StatusBadge } from '../ui/StatusBadge.tsx'

const COPY: Record<ConnectionState, string> = {
  CONNECTED: 'Live updates are connected.',
  CONNECTING: 'Connecting to live updates.',
  RECONNECTING: 'Live tracking connection interrupted.',
  DISCONNECTED: 'Live tracking is offline.',
  STALE: 'Location is not live.',
}

export function TrackingStatus({ state, detail }: { state: ConnectionState; detail?: string }) {
  return (
    <div className="rounded-sm border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Connection</p>
        <StatusBadge status={state} />
      </div>
      <div className="mt-2" aria-live="polite">
        <p className="text-sm text-ink">{COPY[state]}</p>
        {detail ? <p className="mt-1 text-sm text-ink">{detail}</p> : null}
      </div>
    </div>
  )
}

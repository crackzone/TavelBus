import type { ReactNode } from 'react'
import { formatCurrency, formatDateTime, formatSeat } from '../../lib/format.ts'
import type { BookingStatus, PaymentStatus } from '../../types/common.ts'
import { StatusBadge } from '../ui/StatusBadge.tsx'

export function BookingCard({
  reference,
  seatNumber,
  amount,
  status,
  paymentStatus,
  origin,
  destination,
  departure,
  action,
}: {
  reference: string
  seatNumber: number
  amount: number
  status: BookingStatus
  paymentStatus: PaymentStatus
  origin?: string
  destination?: string
  departure?: string
  action?: ReactNode
}) {
  return (
    <article className="rounded-sm border border-line bg-surface p-4 shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">Booking reference</p>
          <h3 className="mt-1 font-mono text-base font-semibold text-ink">{reference}</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={status} />
          <StatusBadge status={paymentStatus} />
        </div>
      </div>
      {origin && destination ? (
        <p className="mt-3 text-sm font-medium text-ink">
          {origin} to {destination}
        </p>
      ) : null}
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted">Seat</dt>
          <dd className="mt-1 text-ink">{formatSeat(seatNumber)}</dd>
        </div>
        <div>
          <dt className="text-muted">Amount</dt>
          <dd className="mt-1 text-ink">{formatCurrency(amount)}</dd>
        </div>
        {departure ? (
          <div>
            <dt className="text-muted">Departure</dt>
            <dd className="mt-1 text-ink">
              <time dateTime={departure}>{formatDateTime(departure)}</time>
            </dd>
          </div>
        ) : null}
      </dl>
      {action ? <div className="mt-4">{action}</div> : null}
    </article>
  )
}

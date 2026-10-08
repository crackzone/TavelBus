import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { confirmAction, proposeAction } from '../../api/agent.ts'
import { FormAlert } from '../auth/FormAlert.tsx'
import { Notice } from '../passenger/Notice.tsx'
import { useClock } from '../passenger/hooks.ts'
import { useAdminBookingsQuery } from '../admin/hooks.ts'
import { Button } from '../../components/ui/Button.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatCurrency, formatSeat } from '../../lib/format.ts'
import { isTripReference } from '../passenger/match.ts'
import { useMyBookingsQuery } from '../passenger/hooks.ts'
import type { AgentActionType } from '../../types/common.ts'
import type { ActionExecutionResult, ActionProposal } from '../../types/assistant.ts'
import type { Booking } from '../../types/bookings.ts'

const DECIMAL = /^(?!^[-+.]*$)[+-]?0*\d*\.?\d*$/

export function ActionDesk({ audience }: { audience: 'passenger' | 'admin' }) {
  return audience === 'admin' ? <AdminDesk /> : <PassengerDesk />
}

function PassengerDesk() {
  const bookings = useMyBookingsQuery()
  return <Desk bookings={bookings} />
}

function AdminDesk() {
  const bookings = useAdminBookingsQuery({})
  return <Desk bookings={bookings} />
}

function Desk({ bookings }: { bookings: { data?: { items: Booking[] }; isPending: boolean; isError: boolean; error: unknown } }) {
  const queryClient = useQueryClient()
  const confirmed = (bookings.data?.items ?? []).filter((booking) => booking.status === 'CONFIRMED')
  const [bookingId, setBookingId] = useState('')
  const [tripId, setTripId] = useState('')
  const [seat, setSeat] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<{ message: string; requestId?: string } | null>(null)
  const [proposal, setProposal] = useState<ActionProposal | null>(null)
  const [result, setResult] = useState<ActionExecutionResult | null>(null)
  const [pendingChoice, setPendingChoice] = useState<boolean | null>(null)

  const propose = useMutation({
    mutationFn: proposeAction,
    onSuccess: (next) => {
      setProposal(next)
      setResult(null)
      setRequestError(null)
    },
    onError: (error) => setRequestError(errorNotice(error)),
  })
  const confirm = useMutation({
    mutationFn: confirmAction,
    onSuccess: async (next) => {
      setPendingChoice(null)
      setProposal(null)
      setResult(next)
      setRequestError(null)
      if (next.success) await queryClient.invalidateQueries({ queryKey: ['bookings'] })
    },
    onError: (error) => {
      setPendingChoice(null)
      setProposal(null)
      setRequestError(errorNotice(error))
    },
  })

  const busy = propose.isPending || confirm.isPending

  function reviewCancellation() {
    if (!isTripReference(bookingId)) {
      setFormError('Choose a confirmed booking.')
      return
    }
    setFormError(null)
    propose.mutate({ action_type: 'CANCEL_BOOKING', parameters: { booking_id: bookingId } })
  }

  function reviewBooking() {
    const seatNumber = Number(seat)
    if (!isTripReference(tripId)) {
      setFormError('Enter the trip id. It is a UUID.')
      return
    }
    if (!Number.isInteger(seatNumber) || seatNumber <= 0) {
      setFormError('Enter a seat number.')
      return
    }
    setFormError(null)
    propose.mutate({ action_type: 'BOOK_TICKET', parameters: { trip_id: tripId, seat_number: seatNumber } })
  }

  function answer(confirmedChoice: boolean) {
    if (!proposal || busy) return
    if (new Date(proposal.expires_at).getTime() <= Date.now()) return
    setPendingChoice(confirmedChoice)
    confirm.mutate({ proposal_token: proposal.proposal_token, confirmed: confirmedChoice })
  }

  return (
    <section className="flex flex-col gap-4 rounded-sm border border-line bg-surface p-4 shadow-panel">
      <div>
        <h2 className="text-base font-semibold text-ink">Confirmation</h2>
        <p className="mt-1 text-sm text-muted">Review a booking or cancellation first. Nothing changes until you confirm the proposal.</p>
      </div>
      {bookings.isPending ? <LoadingSkeleton lines={3} label="Loading bookings" /> : null}
      {bookings.isError ? <FormAlert message={getErrorMessage(bookings.error)} requestId={isApiError(bookings.error) ? bookings.error.requestId : undefined} /> : null}
      <div className="grid gap-4 lg:grid-cols-2">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            reviewBooking()
          }}
        >
          <h3 className="text-sm font-semibold text-ink">Book a seat</h3>
          <Input id="proposal-trip" label="Trip" value={tripId} onChange={(event) => setTripId(event.target.value)} required disabled={busy || proposal !== null} hint="Trip id from a scheduled trip." />
          <Input id="proposal-seat" label="Seat" type="number" min={1} value={seat} onChange={(event) => setSeat(event.target.value)} required disabled={busy || proposal !== null} />
          <div>
            <Button type="submit" variant="secondary" loading={propose.isPending && propose.variables?.action_type === 'BOOK_TICKET'} disabled={busy || proposal !== null}>
              Review booking
            </Button>
          </div>
        </form>
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            reviewCancellation()
          }}
        >
          <h3 className="text-sm font-semibold text-ink">Cancel a booking</h3>
          {bookings.data && confirmed.length === 0 ? <p className="text-sm text-muted">No confirmed bookings are available to cancel.</p> : null}
          <Select
            id="proposal-booking"
            label="Booking"
            value={bookingId}
            onChange={(event) => setBookingId(event.target.value)}
            required
            disabled={busy || proposal !== null || confirmed.length === 0}
            placeholder="Choose a booking"
            options={confirmed.map((booking) => ({ value: booking.id, label: bookingLabel(booking) }))}
          />
          <div>
            <Button type="submit" variant="secondary" loading={propose.isPending && propose.variables?.action_type === 'CANCEL_BOOKING'} disabled={busy || proposal !== null || confirmed.length === 0}>
              Review cancellation
            </Button>
          </div>
        </form>
      </div>
      {formError ? <p className="text-sm text-danger" role="alert">{formError}</p> : null}
      {requestError ? <FormAlert message={requestError.message} requestId={requestError.requestId} /> : null}
      {proposal ? (
        <ProposalCard
          proposal={proposal}
          pendingChoice={pendingChoice}
          onConfirm={() => answer(true)}
          onReject={() => answer(false)}
        />
      ) : null}
      {result ? <ResultNotice result={result} /> : null}
    </section>
  )
}

function ProposalCard({
  proposal,
  pendingChoice,
  onConfirm,
  onReject,
}: {
  proposal: ActionProposal
  pendingChoice: boolean | null
  onConfirm: () => void
  onReject: () => void
}) {
  const now = useClock(1000)
  const remaining = formatRemaining(proposal.expires_at, now)
  const expired = remaining === null
  return (
    <article className="rounded-sm border border-warning bg-warning-soft p-4" aria-live="polite">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">Action requires confirmation</p>
      <h3 className="mt-2 text-base font-semibold text-ink">{actionLabel(proposal.action_type)}</h3>
      <p className="mt-2 whitespace-pre-wrap text-sm text-ink">{proposal.summary}</p>
      <p className="mt-3 text-sm text-ink">
        {expired ? 'This proposal has expired. Propose it again.' : `Proposal expires in ${remaining}.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" loading={pendingChoice === false} disabled={pendingChoice !== null || expired} onClick={onReject}>
          Don't confirm
        </Button>
        <Button type="button" variant={proposal.action_type === 'CANCEL_BOOKING' ? 'danger' : 'primary'} loading={pendingChoice === true} disabled={pendingChoice !== null || expired} onClick={onConfirm}>
          {proposal.action_type === 'CANCEL_BOOKING' ? 'Confirm cancellation' : 'Confirm booking'}
        </Button>
      </div>
    </article>
  )
}

function ResultNotice({ result }: { result: ActionExecutionResult }) {
  const aborted = result.details.aborted === true
  const tone = result.success ? 'success' : 'info'
  return (
    <div className="flex flex-col gap-2">
      <Notice tone={tone} message={result.message} />
      {aborted ? null : <ResultDetails details={result.details} />}
    </div>
  )
}

function ResultDetails({ details }: { details: Record<string, unknown> }) {
  const reference = typeof details.booking_reference === 'string' ? details.booking_reference : null
  const refund = typeof details.refund_status === 'string' ? details.refund_status : null
  const seat = typeof details.seat_number === 'number' ? details.seat_number : null
  const amount = readMoney(details.amount)
  if (!reference && !refund && seat === null && amount === null) return null
  return (
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      {reference ? <Detail term="Booking reference" value={reference} mono /> : null}
      {seat !== null ? <Detail term="Seat" value={formatSeat(seat)} /> : null}
      {amount !== null ? <Detail term="Amount" value={formatCurrency(amount)} /> : null}
      {refund ? <Detail term="Refund status" value={refund} /> : null}
    </dl>
  )
}

function Detail({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className={mono ? 'mt-1 font-mono text-xs text-ink' : 'mt-1 text-ink'}>{value}</dd>
    </div>
  )
}

function bookingLabel(booking: Booking): string {
  return `${booking.booking_reference} · seat ${formatSeat(booking.seat_number)}`
}

function actionLabel(action: AgentActionType): string {
  return action === 'CANCEL_BOOKING' ? 'Cancel a booking' : 'Book a seat'
}

function formatRemaining(expiresAt: string, now: number): string | null {
  const remainingMs = new Date(expiresAt).getTime() - now
  if (remainingMs <= 0) return null
  const totalSeconds = Math.floor(remainingMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

function readMoney(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && DECIMAL.test(value)) {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount : null
  }
  return null
}

function errorNotice(error: unknown): { message: string; requestId?: string } {
  return { message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined }
}

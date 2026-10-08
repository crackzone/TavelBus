import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { BookingCard } from '../../components/common/BookingCard.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button, ButtonLink } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { cancelBooking } from '../../api/bookings.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { Notice } from '../../features/passenger/Notice.tsx'
import { useBookingQuery, usePublicRouteQuery, usePublicTripQuery } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatCurrency, formatDateTime, formatSeat } from '../../lib/format.ts'
import type { BookingCancelResult } from '../../types/bookings.ts'

export function BookingPage() {
  const { bookingId } = useParams()
  const queryClient = useQueryClient()
  const bookingQuery = useBookingQuery(bookingId)
  const tripQuery = usePublicTripQuery(bookingQuery.data?.trip_id)
  const routeQuery = usePublicRouteQuery(tripQuery.data?.route_id)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [cancelResult, setCancelResult] = useState<BookingCancelResult | null>(null)
  const reference = bookingQuery.data?.booking_reference ?? 'Booking'
  useDocumentTitle(`${reference} · TravelBus Manager`)

  if (!bookingId) return <LoadFailure title="Booking reference is missing" error={new Error('Missing booking')} onRetry={() => undefined} />
  if (bookingQuery.isPending) return <LoadingSkeleton lines={5} label="Loading booking" />
  if (bookingQuery.isError || !bookingQuery.data) {
    return <LoadFailure title="That booking could not be loaded" error={bookingQuery.error} onRetry={() => void bookingQuery.refetch()} />
  }

  const booking = bookingQuery.data
  const canCancel = booking.status !== 'CANCELLED'

  async function confirmCancel() {
    if (!bookingId) return
    setPending(true)
    setFormError(null)
    try {
      const result = await cancelBooking(bookingId)
      setCancelResult(result)
      setConfirmOpen(false)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.booking(bookingId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.myBookings }),
        booking.trip_id ? queryClient.invalidateQueries({ queryKey: queryKeys.tripSeats(booking.trip_id) }) : Promise.resolve(),
      ])
    } catch (error) {
      setFormError({
        message: getErrorMessage(error),
        requestId: isApiError(error) ? error.requestId : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={booking.booking_reference} description="Booking details from your account." />
      {tripQuery.isError ? (
        <LoadFailure title="The trip for this booking could not be loaded" error={tripQuery.error} onRetry={() => void tripQuery.refetch()} />
      ) : null}
      {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
      {cancelResult ? (
        <Notice tone="success" message={`Cancellation recorded. Refund status: ${cancelResult.refund_status}.`} />
      ) : null}
      <BookingCard
        reference={booking.booking_reference}
        seatNumber={booking.seat_number}
        amount={booking.amount}
        status={booking.status}
        paymentStatus={booking.payment_status}
        origin={routeQuery.data?.origin}
        destination={routeQuery.data?.destination}
        departure={tripQuery.data?.departure_time}
        action={
          <div className="flex flex-col gap-3">
            {booking.cancelled_at ? (
              <p className="text-sm text-muted">Cancelled {formatDateTime(booking.cancelled_at)}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <ButtonLink to={`/passenger/bookings/${booking.id}/tracking`}>Track bus</ButtonLink>
              {canCancel ? (
                <Button type="button" variant="danger" onClick={() => setConfirmOpen(true)}>
                  Cancel booking
                </Button>
              ) : null}
            </div>
          </div>
        }
      />
      <Modal
        open={confirmOpen}
        title="Cancel booking?"
        description="The seat is released only after the booking service accepts the cancellation."
        onClose={() => {
          if (!pending) setConfirmOpen(false)
        }}
      >
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Booking</dt>
            <dd className="mt-1 font-mono text-ink">{booking.booking_reference}</dd>
          </div>
          <div>
            <dt className="text-muted">Trip</dt>
            <dd className="mt-1 text-ink">
              {routeQuery.data ? `${routeQuery.data.origin} → ${routeQuery.data.destination}` : 'Trip details are still loading'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Seat</dt>
            <dd className="mt-1 text-ink">{formatSeat(booking.seat_number)}</dd>
          </div>
          <div>
            <dt className="text-muted">Amount</dt>
            <dd className="mt-1 text-ink">{formatCurrency(booking.amount)}</dd>
          </div>
        </dl>
        <p className="mt-4 text-sm text-muted">The service reports the refund status after you confirm. This step does not cancel by itself.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmOpen(false)}>
            Go Back
          </Button>
          <Button type="button" variant="danger" loading={pending} onClick={() => void confirmCancel()}>
            Confirm Cancellation
          </Button>
        </div>
      </Modal>
    </div>
  )
}

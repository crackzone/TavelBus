import { useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { SeatMap } from '../../components/common/SeatMap.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button, ButtonLink } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { usePublicRouteQuery, usePublicTripQuery, useTripSeatsQuery } from '../../features/passenger/hooks.ts'
import { bookingBlockReason } from '../../features/passenger/match.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { createBooking } from '../../api/bookings.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatCurrency, formatDate, formatSeat, formatTime } from '../../lib/format.ts'
import type { Booking } from '../../types/bookings.ts'

export function SeatsPage() {
  const { tripId } = useParams()
  const queryClient = useQueryClient()
  const tripQuery = usePublicTripQuery(tripId)
  const routeQuery = usePublicRouteQuery(tripQuery.data?.route_id)
  const seatsQuery = useTripSeatsQuery(tripId)
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [confirmed, setConfirmed] = useState<Booking | null>(null)
  const idempotencyKey = useRef(crypto.randomUUID())
  const heading = routeQuery.data ? `${routeQuery.data.origin} to ${routeQuery.data.destination}` : 'Select a seat'
  useDocumentTitle(`${heading} · TravelBus Manager`)

  if (!tripId) return <LoadFailure title="Trip reference is missing" error={new Error('Missing trip')} onRetry={() => undefined} />
  if (tripQuery.isPending || seatsQuery.isPending) return <LoadingSkeleton lines={6} label="Loading seats" />
  if (tripQuery.isError || !tripQuery.data) {
    return <LoadFailure title="That trip could not be loaded" error={tripQuery.error} onRetry={() => void tripQuery.refetch()} />
  }
  if (seatsQuery.isError || !seatsQuery.data) {
    return <LoadFailure title="Seats could not be loaded" error={seatsQuery.error} onRetry={() => void seatsQuery.refetch()} />
  }

  const trip = tripQuery.data
  const seats = seatsQuery.data
  const blockReason = bookingBlockReason(trip)
  const selected = seats.find((seat) => seat.seat_number === selectedSeat && seat.status === 'AVAILABLE')

  async function confirmBooking() {
    if (!tripId || !selected) return
    setPending(true)
    setFormError(null)
    try {
      const booking = await createBooking(
        { trip_id: tripId, seat_number: selected.seat_number },
        idempotencyKey.current,
      )
      queryClient.setQueryData(queryKeys.booking(booking.id), booking)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.myBookings }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tripSeats(tripId) }),
      ])
      setConfirmOpen(false)
      setConfirmed(booking)
    } catch (error) {
      const seatTaken = isApiError(error) && error.code === 'SEAT_NOT_AVAILABLE'
      if (seatTaken) {
        setSelectedSeat(null)
        setConfirmOpen(false)
        idempotencyKey.current = crypto.randomUUID()
        await queryClient.invalidateQueries({ queryKey: queryKeys.tripSeats(tripId) })
      }
      setFormError({
        message: getErrorMessage(error),
        requestId: isApiError(error) ? error.requestId : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  if (confirmed) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <PageHeader title="Booking confirmed" description="The booking service stored this reservation." />
        <dl className="grid gap-4 rounded-sm border border-line bg-surface p-4 text-sm">
          <div>
            <dt className="text-muted">Booking reference</dt>
            <dd className="mt-1 font-mono text-base font-semibold text-ink">{confirmed.booking_reference}</dd>
          </div>
          <div>
            <dt className="text-muted">Trip</dt>
            <dd className="mt-1 text-ink">{routeQuery.data ? `${routeQuery.data.origin} to ${routeQuery.data.destination}` : trip.id}</dd>
          </div>
          <div>
            <dt className="text-muted">Seat</dt>
            <dd className="mt-1 text-ink">{formatSeat(confirmed.seat_number)}</dd>
          </div>
          <div>
            <dt className="text-muted">Amount</dt>
            <dd className="mt-1 text-ink">{formatCurrency(confirmed.amount)}</dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="mt-1">
              <StatusBadge status={confirmed.status} />
            </dd>
          </div>
          <div>
            <dt className="text-muted">Payment status</dt>
            <dd className="mt-1">
              <StatusBadge status={confirmed.payment_status} />
            </dd>
          </div>
        </dl>
        <div className="flex flex-wrap gap-2">
          <ButtonLink to={`/passenger/bookings/${confirmed.id}`}>View booking</ButtonLink>
          <ButtonLink to="/passenger/bookings" variant="secondary">
            My bookings
          </ButtonLink>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Select a seat" description={heading} />
      {blockReason ? <Notice message={blockReason} /> : null}
      {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <SeatMap seats={seats} selectedSeatNumber={selected?.seat_number ?? null} onSelect={setSelectedSeat} disabled={Boolean(blockReason)} />
        <aside className="h-fit rounded-sm border border-line bg-surface p-4">
          <h2 className="text-base font-semibold text-ink">Your selection</h2>
          <dl className="mt-3 grid gap-3 text-sm">
            <div>
              <dt className="text-muted">Selected seat</dt>
              <dd className="mt-1 text-ink">{selected ? formatSeat(selected.seat_number) : 'None'}</dd>
            </div>
            <div>
              <dt className="text-muted">Fare</dt>
              <dd className="mt-1 text-ink">{formatCurrency(trip.fare)}</dd>
            </div>
            <div>
              <dt className="text-muted">Departure</dt>
              <dd className="mt-1 text-ink">
                <time dateTime={trip.departure_time}>
                  {formatDate(trip.departure_time)} {formatTime(trip.departure_time)}
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-muted">Destination</dt>
              <dd className="mt-1 text-ink">{routeQuery.data?.destination ?? 'Loading route'}</dd>
            </div>
          </dl>
          <Button
            type="button"
            className="mt-4 w-full"
            disabled={!selected || Boolean(blockReason)}
            onClick={() => {
              idempotencyKey.current = crypto.randomUUID()
              setConfirmOpen(true)
            }}
          >
            Book Seat
          </Button>
        </aside>
      </div>
      <Modal
        open={confirmOpen}
        title="Confirm your booking"
        description="This sends the booking to the service. The seat is not held before you confirm."
        onClose={() => {
          if (!pending) setConfirmOpen(false)
        }}
      >
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Trip</dt>
            <dd className="mt-1 text-ink">
              {routeQuery.data ? `${routeQuery.data.origin} → ${routeQuery.data.destination}` : 'Trip'}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Departure</dt>
            <dd className="mt-1 text-ink">
              {formatDate(trip.departure_time)} {formatTime(trip.departure_time)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Seat</dt>
            <dd className="mt-1 text-ink">{selected ? formatSeat(selected.seat_number) : 'None'}</dd>
          </div>
          <div>
            <dt className="text-muted">Fare</dt>
            <dd className="mt-1 text-ink">{formatCurrency(trip.fare)}</dd>
          </div>
        </dl>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)} disabled={pending}>
            Back
          </Button>
          <Button type="button" loading={pending} onClick={() => void confirmBooking()}>
            Confirm Booking
          </Button>
        </div>
      </Modal>
    </div>
  )
}

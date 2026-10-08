import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button, ButtonLink } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { finishTrip, startTrip } from '../../api/tracking.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useDriverTripsQuery } from '../../features/driver/hooks.ts'
import { useTripGps, type GpsPhase } from '../../features/driver/useTripGps.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useClock, usePublicRouteQuery } from '../../features/passenger/hooks.ts'
import { LOCATION_STALE_MS } from '../../features/passenger/tracking.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatAgo, formatDateTime } from '../../lib/format.ts'
import type { TripStatus } from '../../types/common.ts'
import type { DriverTrip } from '../../types/tracking.ts'

export function ActiveTripPage() {
  const { tripId } = useParams()
  const queryClient = useQueryClient()
  const tripsQuery = useDriverTripsQuery()
  const trip = tripsQuery.data?.find((item) => item.id === tripId)
  const routeQuery = usePublicRouteQuery(trip?.route_id)
  const missing = Boolean(tripId && tripsQuery.data && !trip)
  const now = useClock(1_000)
  const sending = trip?.status === 'IN_PROGRESS'
  const [gpsAttempt, setGpsAttempt] = useState(0)
  const gps = useTripGps(trip?.id, sending, gpsAttempt)
  const [pending, setPending] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const title = missing ? 'Trip not assigned' : routeQuery.data ? `${routeQuery.data.origin} to ${routeQuery.data.destination}` : 'Active trip'
  useDocumentTitle(`${title} · TravelBus Manager`)

  if (!tripId) return <LoadFailure title="Trip reference is missing" error={new Error('Missing trip')} onRetry={() => undefined} />
  if (tripsQuery.isPending) return <LoadingSkeleton lines={5} label="Loading assigned trip" />
  if (tripsQuery.isError) {
    return <LoadFailure title="Assigned trips could not be loaded" error={tripsQuery.error} onRetry={() => void tripsQuery.refetch()} />
  }
  if (!trip) {
    return (
      <EmptyState
        title="Trip not assigned"
        description="This trip is not on the signed-in driver's list."
        action={
          <ButtonLink to="/driver/trips" variant="secondary">
            Back to trips
          </ButtonLink>
        }
      />
    )
  }

  async function run(action: 'start' | 'finish') {
    if (!trip) return
    setPending(true)
    setFormError(null)
    try {
      const result = action === 'start' ? await startTrip(trip.id) : await finishTrip(trip.id)
      patchStatus(queryClient, trip.id, result.status)
      setNotice(result.message)
      setConfirmFinish(false)
      await queryClient.invalidateQueries({ queryKey: queryKeys.driverTrips })
    } catch (error) {
      setFormError({
        message: getErrorMessage(error),
        requestId: isApiError(error) ? error.requestId : undefined,
      })
    } finally {
      setPending(false)
    }
  }

  const lastUpdate = gps.lastSentAt ?? gps.lastFixAt
  const stale = lastUpdate !== null && now - lastUpdate >= LOCATION_STALE_MS

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title={title} description={routeQuery.data?.name ?? 'Assigned trip'} />
      <section className="rounded-sm border border-line bg-surface p-4 shadow-panel" aria-label="Trip status">
        <p className="text-xs font-medium uppercase tracking-wide text-muted">Trip status</p>
        <div className="mt-2">
          <StatusBadge status={trip.status} />
        </div>
        <dl className="mt-4 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Departure</dt>
            <dd className="mt-1 font-medium text-ink">{formatDateTime(trip.departure_time)}</dd>
          </div>
          <div>
            <dt className="text-muted">Bus</dt>
            <dd className="mt-1 text-ink">The driver trip does not include a bus name.</dd>
          </div>
        </dl>
      </section>
      {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
      {notice ? <Notice tone="success" message={notice} /> : null}
      <GpsPanel
        sending={sending}
        phase={sending ? gps.phase : 'idle'}
        lastUpdate={lastUpdate}
        now={now}
        stale={stale}
        error={gps.lastError}
        onRetry={() => setGpsAttempt((value) => value + 1)}
      />
      {trip.status === 'SCHEDULED' || trip.status === 'BOARDING' ? (
        <Button type="button" size="lg" className="w-full" loading={pending} onClick={() => void run('start')}>
          Start trip
        </Button>
      ) : null}
      {trip.status === 'IN_PROGRESS' ? (
        <Button type="button" size="lg" variant="danger" className="w-full" disabled={pending} onClick={() => setConfirmFinish(true)}>
          Finish trip
        </Button>
      ) : null}
      <p className="text-sm text-muted">
        <Link to={`/driver/trips/${trip.id}`} className="focus-ring font-medium text-brand">
          Trip details
        </Link>
      </p>
      <Modal
        open={confirmFinish}
        title="Finish trip?"
        description="The trip is marked completed only after the service accepts this."
        onClose={() => {
          if (!pending) setConfirmFinish(false)
        }}
      >
        <p className="text-sm text-muted">Finishing stops location updates from this device.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirmFinish(false)}>
            Go Back
          </Button>
          <Button type="button" variant="danger" loading={pending} onClick={() => void run('finish')}>
            Finish trip
          </Button>
        </div>
      </Modal>
    </div>
  )
}

function GpsPanel({
  sending,
  phase,
  lastUpdate,
  now,
  stale,
  error,
  onRetry,
}: {
  sending: boolean
  phase: GpsPhase
  lastUpdate: number | null
  now: number
  stale: boolean
  error: string | null
  onRetry: () => void
}) {
  const connected = sending && phase === 'watching' && lastUpdate !== null && !stale && !error
  return (
    <section className="rounded-sm border border-line bg-surface p-4 shadow-panel" aria-label="GPS">
      <h2 className="text-base font-semibold text-ink">GPS</h2>
      <p className="mt-2 text-sm font-medium text-ink">{connected ? 'Connected' : stale ? 'Stale' : 'Not connected'}</p>
      <p className="mt-2 text-sm text-ink">{gpsCopy(sending, phase, stale, Boolean(error))}</p>
      {lastUpdate !== null ? <p className="mt-2 text-sm text-ink">Last update: {formatAgo(lastUpdate, now)}</p> : null}
      {error ? <p className="mt-2 text-sm text-ink">{error}</p> : null}
      {sending && phase !== 'watching' && phase !== 'idle' ? (
        <div className="mt-3">
          <Button type="button" variant="secondary" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}
    </section>
  )
}

function gpsCopy(sending: boolean, phase: GpsPhase, stale: boolean, failed: boolean): string {
  if (!sending) return 'Location is sent after the trip is started.'
  if (phase === 'denied') return 'Location permission was denied. This device will not send a position.'
  if (phase === 'unavailable') return 'GPS is unavailable on this device.'
  if (phase === 'unsupported') return 'This browser does not provide location.'
  if (phase === 'timeout') return 'This device did not return a position.'
  if (stale) return 'The latest device position is stale.'
  if (failed) return 'A position is available, and the last update was not saved.'
  if (phase === 'watching') return 'This device is sharing its position.'
  return 'Waiting for a position from this device.'
}

function patchStatus(queryClient: ReturnType<typeof useQueryClient>, tripId: string, status: TripStatus): void {
  queryClient.setQueryData<DriverTrip[]>(queryKeys.driverTrips, (current) =>
    current?.map((item) => (item.id === tripId ? { ...item, status } : item)),
  )
}

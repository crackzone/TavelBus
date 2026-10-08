import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createTrip } from '../../api/trips.ts'
import { DataTable, type DataColumn } from '../../components/common/DataTable.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { DatePicker } from '../../components/ui/DatePicker.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useAdminRoutesQuery, useAdminTripsQuery, useBusesQuery } from '../../features/admin/hooks.ts'
import { driverLabel, parseOptionalUuid, toApiDateTime } from '../../features/admin/labels.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useClock } from '../../features/passenger/hooks.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatCurrency, formatDateTime, localDateKey } from '../../lib/format.ts'
import { tripStatuses, type TripStatus } from '../../types/common.ts'
import type { Bus } from '../../types/fleet.ts'
import type { Route } from '../../types/routes.ts'
import type { AdminTripQuery, Trip } from '../../types/trips.ts'

type Draft = {
  routeId: string
  busId: string
  driverId: string
  departure: string
  arrival: string
  fare: string
}

const emptyDraft: Draft = { routeId: '', busId: '', driverId: '', departure: '', arrival: '', fare: '' }

export function TripsPage() {
  useDocumentTitle('Trips · TravelBus Manager')
  const now = useClock()
  const queryClient = useQueryClient()
  const routes = useAdminRoutesQuery()
  const buses = useBusesQuery()
  const [routeId, setRouteId] = useState('')
  const [busId, setBusId] = useState('')
  const [status, setStatus] = useState('')
  const [date, setDate] = useState('')
  const filters = useMemo<AdminTripQuery>(
    () => ({
      route_id: routeId || undefined,
      bus_id: busId || undefined,
      status: isTripStatus(status) ? status : undefined,
    }),
    [busId, routeId, status],
  )
  const trips = useAdminTripsQuery(filters)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [review, setReview] = useState<Draft | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const routeMap = useMemo(() => new Map((routes.data?.items ?? []).map((route) => [route.id, route])), [routes.data])
  const busMap = useMemo(() => new Map((buses.data?.items ?? []).map((bus) => [bus.id, bus])), [buses.data])
  const rows = (trips.data?.items ?? []).filter((trip) => !date || localDateKey(trip.departure_time) === date)
  const activeRoutes = (routes.data?.items ?? []).filter((route) => route.is_active)
  const activeBuses = (buses.data?.items ?? []).filter((bus) => bus.status === 'ACTIVE')

  function openReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = validateDraft(draft, now)
    setFieldError(message)
    setFormError(null)
    if (!message) setReview(draft)
  }

  async function schedule() {
    if (!review) return
    const departure = toApiDateTime(review.departure)
    const arrival = toApiDateTime(review.arrival)
    const driver = parseOptionalUuid(review.driverId)
    if (!departure || !arrival || driver.error) return
    setPending(true)
    setFormError(null)
    try {
      const trip = await createTrip({
        route_id: review.routeId,
        bus_id: review.busId,
        departure_time: departure,
        arrival_time: arrival,
        fare: Number(review.fare),
        ...(driver.id ? { driver_id: driver.id } : {}),
      })
      setDraft(emptyDraft)
      setReview(null)
      setNotice(`Trip scheduled for ${formatDateTime(trip.departure_time)}.`)
      await queryClient.invalidateQueries({ queryKey: ['trips', 'admin'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  const columns: readonly DataColumn<Trip>[] = [
    {
      id: 'route',
      header: 'Route',
      cell: (trip) => (
        <Link to={`/admin/trips/${trip.id}`} className="focus-ring font-medium text-brand">
          {routeMap.get(trip.route_id)?.name ?? 'Route'}
        </Link>
      ),
    },
    { id: 'status', header: 'Status', cell: (trip) => <StatusBadge status={trip.status} /> },
    { id: 'bus', header: 'Bus', cell: (trip) => busMap.get(trip.bus_id)?.registration_number ?? trip.bus_id },
    { id: 'driver', header: 'Driver', cell: (trip) => <span className="font-mono text-xs">{driverLabel(trip.driver_id)}</span> },
    { id: 'date', header: 'Departure', cell: (trip) => formatDateTime(trip.departure_time) },
    {
      id: 'manifest',
      header: 'Manifest',
      cell: (trip) => (
        <Link to={`/admin/trips/${trip.id}/manifest`} className="focus-ring font-medium text-brand">
          Manifest
        </Link>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Trips" description="Scheduled trips with route, bus, driver, and status. The date filter applies to trips returned for the other filters." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select id="trip-route" label="Route" value={routeId} onChange={(event) => setRouteId(event.target.value)} options={[{ value: '', label: 'All routes' }, ...(routes.data?.items ?? []).map((route) => ({ value: route.id, label: route.name }))]} />
        <Select id="trip-bus" label="Bus" value={busId} onChange={(event) => setBusId(event.target.value)} options={[{ value: '', label: 'All buses' }, ...(buses.data?.items ?? []).map((bus) => ({ value: bus.id, label: bus.registration_number }))]} />
        <Select id="trip-status" label="Status" value={status} onChange={(event) => setStatus(event.target.value)} options={[{ value: '', label: 'All statuses' }, ...tripStatuses.map((item) => ({ value: item, label: item }))]} />
        <DatePicker id="trip-date" label="Date" value={date} onChange={(event) => setDate(event.target.value)} />
      </div>
      {trips.isPending ? <LoadingSkeleton lines={5} label="Loading trips" /> : null}
      {trips.isError ? <LoadFailure title="Trips could not be loaded" error={trips.error} onRetry={() => void trips.refetch()} /> : null}
      {trips.data ? (
        <DataTable caption="Trips" columns={columns} rows={rows} getRowKey={(trip) => trip.id} emptyTitle="No trips" emptyDescription={date || routeId || busId || status ? 'No trips match these filters.' : 'No trips are scheduled.'} />
      ) : null}
      <form className="grid max-w-xl gap-4" onSubmit={openReview}>
        <h2 className="text-base font-semibold text-ink">Schedule a trip</h2>
        <p className="text-sm text-muted">Only active routes and active buses can be scheduled. A driver account id is optional because the trip list does not include a driver directory.</p>
        <Select id="new-route" label="Route" required value={draft.routeId} onChange={(event) => setDraft({ ...draft, routeId: event.target.value })} placeholder="Choose a route" options={activeRoutes.map((route) => ({ value: route.id, label: route.name }))} />
        <Select id="new-bus" label="Bus" required value={draft.busId} onChange={(event) => setDraft({ ...draft, busId: event.target.value })} placeholder="Choose a bus" options={activeBuses.map((bus) => ({ value: bus.id, label: `${bus.registration_number} · ${bus.display_name}` }))} />
        <Input id="new-driver" label="Driver" value={draft.driverId} onChange={(event) => setDraft({ ...draft, driverId: event.target.value })} hint="Optional account id." />
        <Input id="new-departure" label="Departure" required type="datetime-local" value={draft.departure} onChange={(event) => setDraft({ ...draft, departure: event.target.value })} />
        <Input id="new-arrival" label="Arrival" required type="datetime-local" value={draft.arrival} onChange={(event) => setDraft({ ...draft, arrival: event.target.value })} />
        <Input id="new-fare" label="Fare" required type="number" min={0} step="0.01" value={draft.fare} onChange={(event) => setDraft({ ...draft, fare: event.target.value })} />
        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}
        <div><Button type="submit">Review trip</Button></div>
      </form>
      {review ? (
        <Review
          draft={review}
          route={routeMap.get(review.routeId)}
          bus={busMap.get(review.busId)}
          pending={pending}
          error={formError}
          onBack={() => setReview(null)}
          onSubmit={() => void schedule()}
        />
      ) : null}
      {notice ? <Notice tone="success" message={notice} /> : null}
    </div>
  )
}

function Review({
  draft,
  route,
  bus,
  pending,
  error,
  onBack,
  onSubmit,
}: {
  draft: Draft
  route?: Route
  bus?: Bus
  pending: boolean
  error: { message: string; requestId?: string } | null
  onBack: () => void
  onSubmit: () => void
}) {
  return (
    <section className="max-w-xl rounded-sm border border-line bg-surface p-4 shadow-panel" aria-label="Review trip">
      <h2 className="text-base font-semibold text-ink">Review</h2>
      <dl className="mt-4 grid gap-3 text-sm">
        <div><dt className="text-muted">Route</dt><dd className="mt-1 text-ink">{route?.name ?? draft.routeId}</dd></div>
        <div><dt className="text-muted">Bus</dt><dd className="mt-1 text-ink">{bus ? `${bus.registration_number} · ${bus.display_name}` : draft.busId}</dd></div>
        <div><dt className="text-muted">Driver</dt><dd className="mt-1 font-mono text-xs text-ink">{driverLabel(parseOptionalUuid(draft.driverId).id ?? null)}</dd></div>
        <div><dt className="text-muted">Departure</dt><dd className="mt-1 text-ink">{formatDateTime(toApiDateTime(draft.departure) ?? draft.departure)}</dd></div>
        <div><dt className="text-muted">Arrival</dt><dd className="mt-1 text-ink">{formatDateTime(toApiDateTime(draft.arrival) ?? draft.arrival)}</dd></div>
        <div><dt className="text-muted">Fare</dt><dd className="mt-1 text-ink">{formatCurrency(Number(draft.fare))}</dd></div>
      </dl>
      {error ? <div className="mt-4"><FormAlert message={error.message} requestId={error.requestId} /></div> : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={pending} onClick={onBack}>Back</Button>
        <Button type="button" loading={pending} onClick={onSubmit}>Schedule trip</Button>
      </div>
    </section>
  )
}

function validateDraft(draft: Draft, now: number): string | null {
  if (!draft.routeId || !draft.busId) return 'Choose a route and a bus.'
  const driver = parseOptionalUuid(draft.driverId)
  if (driver.error) return driver.error
  const departure = toApiDateTime(draft.departure)
  const arrival = toApiDateTime(draft.arrival)
  if (!departure || !arrival) return 'Enter a departure and an arrival.'
  if (new Date(departure).getTime() <= now) return 'Departure must be later than now.'
  if (departure >= arrival) return 'Arrival must be after departure.'
  const fare = Number(draft.fare)
  if (!Number.isFinite(fare) || fare < 0) return 'Enter a fare of zero or more.'
  return null
}

function isTripStatus(value: string): value is TripStatus {
  return tripStatuses.some((status) => status === value)
}

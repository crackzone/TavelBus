import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { cancelTrip } from '../../api/trips.ts'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button, ButtonLink } from '../../components/ui/Button.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useAdminTripQuery, useBusesQuery, useAdminRoutesQuery } from '../../features/admin/hooks.ts'
import { driverLabel } from '../../features/admin/labels.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatCurrency, formatDateTime } from '../../lib/format.ts'

export function TripPage() {
  const { tripId } = useParams()
  const queryClient = useQueryClient()
  const tripQuery = useAdminTripQuery(tripId)
  const routes = useAdminRoutesQuery()
  const buses = useBusesQuery()
  const trip = tripQuery.data
  const route = routes.data?.items.find((item) => item.id === trip?.route_id)
  const bus = buses.data?.items.find((item) => item.id === trip?.bus_id)
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  useDocumentTitle(`${route?.name ?? 'Trip'} · TravelBus Manager`)

  if (!tripId) return <LoadFailure title="Trip reference is missing" error={new Error('Missing trip')} onRetry={() => undefined} />
  if (tripQuery.isPending) return <LoadingSkeleton lines={5} label="Loading trip" />
  if (tripQuery.isError || !trip) return <LoadFailure title="That trip could not be loaded" error={tripQuery.error} onRetry={() => void tripQuery.refetch()} />

  const current = trip

  async function confirmCancel() {
    setPending(true)
    setFormError(null)
    try {
      const updated = await cancelTrip(current.id)
      setNotice(`Trip status is ${updated.status}.`)
      setConfirming(false)
      await queryClient.invalidateQueries({ queryKey: ['trips', 'admin'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={route?.name ?? 'Trip'} description={route ? `${route.origin} to ${route.destination}` : 'Route details are still loading'} actions={<StatusBadge status={current.status} />} />
      {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
      {notice ? <Notice tone="success" message={notice} /> : null}
      <dl className="grid gap-4 rounded-sm border border-line bg-surface p-4 text-sm shadow-panel sm:grid-cols-2">
        <Field term="Bus" value={bus ? `${bus.registration_number} · ${bus.display_name}` : 'Bus details are still loading'} />
        <Field term="Driver" value={driverLabel(current.driver_id)} mono={current.driver_id !== null} />
        <Field term="Departure" value={formatDateTime(current.departure_time)} />
        <Field term="Arrival" value={formatDateTime(current.arrival_time)} />
        <Field term="Fare" value={formatCurrency(current.fare)} />
      </dl>
      <div className="flex flex-wrap gap-2">
        <ButtonLink to={`/admin/trips/${current.id}/manifest`}>Manifest</ButtonLink>
        {current.status !== 'CANCELLED' ? (
          <Button type="button" variant="danger" onClick={() => setConfirming(true)}>Cancel trip</Button>
        ) : null}
      </div>
      <Link to="/admin/trips" className="focus-ring text-sm font-medium text-brand">Back to trips</Link>
      <Modal open={confirming} title="Cancel trip?" description="The trip service marks this trip cancelled." onClose={() => { if (!pending) setConfirming(false) }}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>Go Back</Button>
          <Button type="button" variant="danger" loading={pending} onClick={() => void confirmCancel()}>Cancel trip</Button>
        </div>
      </Modal>
    </div>
  )
}

function Field({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{term}</dt>
      <dd className={mono ? 'mt-1 font-mono text-xs text-ink' : 'mt-1 text-ink'}>{value}</dd>
    </div>
  )
}

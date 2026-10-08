import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { createStop, deleteStop } from '../../api/routes.ts'
import { MapPanel } from '../../components/common/MapPanel.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { RouteTimeline } from '../../components/common/RouteTimeline.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useAdminRouteQuery } from '../../features/admin/hooks.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatDuration, formatKilometers } from '../../lib/format.ts'
import type { Stop } from '../../types/routes.ts'

export function RoutePage() {
  const { routeId } = useParams()
  const queryClient = useQueryClient()
  const routeQuery = useAdminRouteQuery(routeId)
  const route = routeQuery.data
  const [name, setName] = useState('')
  const [sequence, setSequence] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [target, setTarget] = useState<Stop | null>(null)
  useDocumentTitle(`${route?.name ?? 'Route'} · TravelBus Manager`)

  if (!routeId) return <LoadFailure title="Route reference is missing" error={new Error('Missing route')} onRetry={() => undefined} />
  if (routeQuery.isPending) return <LoadingSkeleton lines={6} label="Loading route" />
  if (routeQuery.isError || !route) return <LoadFailure title="That route could not be loaded" error={routeQuery.error} onRetry={() => void routeQuery.refetch()} />

  const current = route
  const stops = [...current.stops].sort((left, right) => left.sequence_number - right.sequence_number)

  async function onAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const sequenceNumber = Number(sequence)
    const lat = Number(latitude)
    const lng = Number(longitude)
    if (name.trim().length < 2 || !Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
      setFieldError('Enter a stop name and a sequence number of 1 or more.')
      return
    }
    const used = stops.find((stop) => stop.sequence_number === sequenceNumber)
    if (used) {
      setFieldError(`Sequence ${sequenceNumber} is already used by ${used.name}.`)
      return
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      setFieldError('Latitude must be from -90 to 90, and longitude from -180 to 180.')
      return
    }
    setFieldError(null)
    setFormError(null)
    setPending(true)
    try {
      const stop = await createStop(current.id, {
        name: name.trim(),
        sequence_number: sequenceNumber,
        latitude: lat,
        longitude: lng,
      })
      setName('')
      setSequence('')
      setLatitude('')
      setLongitude('')
      setNotice(`${stop.name} was added at sequence ${stop.sequence_number}.`)
      await queryClient.invalidateQueries({ queryKey: ['routes', 'admin'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  async function confirmDelete() {
    if (!target) return
    setPending(true)
    setFormError(null)
    try {
      await deleteStop(target.id)
      setNotice(`${target.name} was removed.`)
      setTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['routes', 'admin'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={current.name} description={`${current.origin} to ${current.destination}`} actions={<StatusBadge status={current.is_active ? 'ACTIVE' : 'INACTIVE'} />} />
      <dl className="grid gap-4 rounded-sm border border-line bg-surface p-4 text-sm shadow-panel sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Distance</dt>
          <dd className="mt-1 text-ink">{current.distance_km == null ? 'Not set' : formatKilometers(current.distance_km)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Duration</dt>
          <dd className="mt-1 text-ink">{current.estimated_duration_minutes == null ? 'Not set' : formatDuration(current.estimated_duration_minutes)}</dd>
        </div>
      </dl>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-sm border border-line bg-surface p-4 shadow-panel">
          <h2 className="text-base font-semibold text-ink">Stops</h2>
          <div className="mt-4">
            <RouteTimeline
              stops={stops.map((stop) => ({
                id: stop.id,
                name: stop.name,
                sequenceNumber: stop.sequence_number,
                latitude: stop.latitude,
                longitude: stop.longitude,
              }))}
            />
          </div>
          {stops.length > 0 ? (
            <ul className="mt-4 grid gap-2">
              {stops.map((stop) => (
                <li key={stop.id}>
                  <button type="button" className="focus-ring text-sm font-medium text-danger" onClick={() => setTarget(stop)}>
                    Remove {stop.name}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
        <MapPanel
          title="Stop coordinates"
          emptyMessage="This route has no coordinates for its stops."
          points={stops.map((stop) => ({
            id: stop.id,
            label: stop.name,
            latitude: stop.latitude,
            longitude: stop.longitude,
            kind: 'stop',
          }))}
        />
      </div>
      <form className="grid max-w-xl gap-4" onSubmit={(event) => void onAdd(event)}>
        <h2 className="text-base font-semibold text-ink">Add stop</h2>
        <Input id="stop-name" label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
        <Input id="stop-sequence" label="Sequence" required type="number" min={1} value={sequence} onChange={(event) => setSequence(event.target.value)} hint="Use the next unused number. Existing stops keep their sequence." />
        <Input id="stop-latitude" label="Latitude" required type="number" step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
        <Input id="stop-longitude" label="Longitude" required type="number" step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}
        {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
        {notice ? <Notice tone="success" message={notice} /> : null}
        <div><Button type="submit" loading={pending}>Add stop</Button></div>
      </form>
      <Link to="/admin/routes" className="focus-ring text-sm font-medium text-brand">Back to routes</Link>
      <Modal open={target !== null} title="Remove stop?" description="The route service deletes this stop." onClose={() => { if (!pending) setTarget(null) }}>
        <p className="text-sm text-ink">{target ? `${target.sequence_number}. ${target.name}` : ''}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setTarget(null)}>Go Back</Button>
          <Button type="button" variant="danger" loading={pending} onClick={() => void confirmDelete()}>Remove stop</Button>
        </div>
      </Modal>
    </div>
  )
}

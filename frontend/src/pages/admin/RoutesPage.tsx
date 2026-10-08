import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createRoute, deactivateRoute, reactivateRoute } from '../../api/routes.ts'
import { DataTable, type DataColumn } from '../../components/common/DataTable.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useAdminRoutesQuery } from '../../features/admin/hooks.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatKilometers, formatDuration } from '../../lib/format.ts'
import type { Route } from '../../types/routes.ts'

export function RoutesPage() {
  useDocumentTitle('Routes · TravelBus Manager')
  const queryClient = useQueryClient()
  const routes = useAdminRoutesQuery()
  const [name, setName] = useState('')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [target, setTarget] = useState<Route | null>(null)

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const distanceKm = distance.trim() === '' ? null : Number(distance)
    const minutes = duration.trim() === '' ? null : Number(duration)
    if (name.trim().length < 2 || origin.trim().length < 2 || destination.trim().length < 2) {
      setFieldError('Enter a route name, origin, and destination.')
      return
    }
    if (origin.trim().toLocaleLowerCase() === destination.trim().toLocaleLowerCase()) {
      setFieldError('Origin and destination must be different.')
      return
    }
    if ((distanceKm !== null && (!(distanceKm > 0))) || (minutes !== null && (!Number.isInteger(minutes) || minutes < 1))) {
      setFieldError('Distance and duration must be greater than zero when you enter them.')
      return
    }
    setFieldError(null)
    setFormError(null)
    setPending(true)
    try {
      const route = await createRoute({
        name: name.trim(),
        origin: origin.trim(),
        destination: destination.trim(),
        distance_km: distanceKm,
        estimated_duration_minutes: minutes,
      })
      setName('')
      setOrigin('')
      setDestination('')
      setDistance('')
      setDuration('')
      setNotice(`${route.name} was added.`)
      await queryClient.invalidateQueries({ queryKey: ['routes', 'admin'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  async function confirmStatus() {
    if (!target) return
    setPending(true)
    setFormError(null)
    try {
      const route = target.is_active ? await deactivateRoute(target.id) : await reactivateRoute(target.id)
      setNotice(route.is_active ? `${route.name} is active.` : `${route.name} is inactive.`)
      setTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['routes', 'admin'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  const columns: readonly DataColumn<Route>[] = [
    {
      id: 'route',
      header: 'Route',
      cell: (route) => (
        <Link to={`/admin/routes/${route.id}`} className="focus-ring font-medium text-brand">
          {route.name}
        </Link>
      ),
    },
    { id: 'origin', header: 'Origin', cell: (route) => route.origin },
    { id: 'destination', header: 'Destination', cell: (route) => route.destination },
    { id: 'distance', header: 'Distance', cell: (route) => (route.distance_km == null ? 'Not set' : formatKilometers(route.distance_km)) },
    { id: 'duration', header: 'Duration', cell: (route) => (route.estimated_duration_minutes == null ? 'Not set' : formatDuration(route.estimated_duration_minutes)) },
    { id: 'status', header: 'Status', cell: (route) => <StatusBadge status={route.is_active ? 'ACTIVE' : 'INACTIVE'} /> },
    {
      id: 'actions',
      header: 'Actions',
      cell: (route) => (
        <button type="button" className="focus-ring font-medium text-brand" onClick={() => setTarget(route)}>
          {route.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Routes" description="Origin, destination, distance, duration, and whether the route is active." />
      <form className="grid gap-4 rounded-sm border border-line bg-surface p-4 shadow-panel sm:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
        <h2 className="text-base font-semibold text-ink sm:col-span-2">Add a route</h2>
        <Input id="route-name" label="Route name" required value={name} onChange={(event) => setName(event.target.value)} className="sm:col-span-2" />
        <Input id="route-origin" label="Origin" required value={origin} onChange={(event) => setOrigin(event.target.value)} />
        <Input id="route-destination" label="Destination" required value={destination} onChange={(event) => setDestination(event.target.value)} />
        <Input id="route-distance" label="Distance (km)" type="number" min={0} step="0.1" value={distance} onChange={(event) => setDistance(event.target.value)} hint="Optional." />
        <Input id="route-duration" label="Duration (minutes)" type="number" min={1} value={duration} onChange={(event) => setDuration(event.target.value)} hint="Optional." />
        {fieldError ? <p className="text-sm text-danger sm:col-span-2">{fieldError}</p> : null}
        {formError ? <div className="sm:col-span-2"><FormAlert message={formError.message} requestId={formError.requestId} /></div> : null}
        {notice ? <div className="sm:col-span-2"><Notice tone="success" message={notice} /></div> : null}
        <div><Button type="submit" loading={pending}>Add route</Button></div>
      </form>
      {routes.isPending ? <LoadingSkeleton lines={5} label="Loading routes" /> : null}
      {routes.isError ? <LoadFailure title="Routes could not be loaded" error={routes.error} onRetry={() => void routes.refetch()} /> : null}
      {routes.data ? (
        <DataTable caption="Routes" columns={columns} rows={routes.data.items} getRowKey={(route) => route.id} emptyTitle="No routes" emptyDescription="No routes are stored yet." />
      ) : null}
      <Modal
        open={target !== null}
        title={target?.is_active ? 'Deactivate route?' : 'Reactivate route?'}
        description={target?.is_active ? 'The route service marks this route inactive.' : 'The route service marks this route active.'}
        onClose={() => { if (!pending) setTarget(null) }}
      >
        <p className="text-sm text-ink">{target?.name}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setTarget(null)}>Go Back</Button>
          <Button type="button" variant={target?.is_active ? 'danger' : 'primary'} loading={pending} onClick={() => void confirmStatus()}>
            {target?.is_active ? 'Deactivate' : 'Reactivate'}
          </Button>
        </div>
      </Modal>
    </div>
  )
}

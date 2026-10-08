import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createBus, deactivateBus } from '../../api/buses.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { DataTable, type DataColumn } from '../../components/common/DataTable.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useBusesQuery } from '../../features/admin/hooks.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatDate } from '../../lib/format.ts'
import { busStatuses, type BusStatus } from '../../types/common.ts'
import type { Bus } from '../../types/fleet.ts'

const statusOptions = [
  { value: '', label: 'All statuses' },
  ...busStatuses.map((status) => ({ value: status, label: statusLabel(status) })),
]

export function FleetPage() {
  useDocumentTitle('Fleet · TravelBus Manager')
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<'' | BusStatus>('')
  const buses = useBusesQuery(status || undefined)
  const [registration, setRegistration] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [capacity, setCapacity] = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [target, setTarget] = useState<Bus | null>(null)

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const seats = Number(capacity)
    if (registration.trim().length < 2 || displayName.trim().length < 2 || !Number.isInteger(seats) || seats < 1 || seats > 100) {
      setFieldError('Enter a registration, a display name, and a seat capacity from 1 to 100.')
      return
    }
    setFieldError(null)
    setFormError(null)
    setPending(true)
    try {
      const bus = await createBus({
        registration_number: registration.trim(),
        display_name: displayName.trim(),
        seat_capacity: seats,
      })
      setRegistration('')
      setDisplayName('')
      setCapacity('')
      setNotice(`${bus.registration_number} is in the fleet.`)
      await queryClient.invalidateQueries({ queryKey: ['buses'] })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  async function confirmDeactivate() {
    if (!target) return
    setPending(true)
    setFormError(null)
    try {
      const bus = await deactivateBus(target.id)
      setNotice(`${bus.registration_number} is inactive.`)
      setTarget(null)
      await queryClient.invalidateQueries({ queryKey: ['buses'] })
      await queryClient.invalidateQueries({ queryKey: queryKeys.bus(bus.id) })
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  const columns: readonly DataColumn<Bus>[] = [
    { id: 'registration', header: 'Registration', cell: (bus) => bus.registration_number },
    { id: 'name', header: 'Display name', cell: (bus) => bus.display_name },
    { id: 'capacity', header: 'Capacity', cell: (bus) => String(bus.seat_capacity) },
    { id: 'status', header: 'Status', cell: (bus) => <StatusBadge status={bus.status} /> },
    { id: 'created', header: 'Created', cell: (bus) => formatDate(bus.created_at) },
    {
      id: 'actions',
      header: 'Actions',
      cell: (bus) => (
        <div className="flex flex-wrap gap-2">
          <Link to={`/admin/fleet/${bus.id}`} className="focus-ring font-medium text-brand">
            View
          </Link>
          <Link to={`/admin/fleet/${bus.id}`} className="focus-ring font-medium text-brand">
            Edit
          </Link>
          {bus.status !== 'INACTIVE' ? (
            <button type="button" className="focus-ring font-medium text-danger" onClick={() => setTarget(bus)}>
              Deactivate
            </button>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Fleet" description="Registration, capacity, and status for every bus." />
      <form className="grid gap-4 rounded-sm border border-line bg-surface p-4 shadow-panel sm:grid-cols-2" onSubmit={(event) => void onCreate(event)}>
        <h2 className="text-base font-semibold text-ink sm:col-span-2">Add a bus</h2>
        <Input id="registration" label="Registration number" required value={registration} onChange={(event) => setRegistration(event.target.value)} />
        <Input id="display-name" label="Display name" required value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
        <Input id="capacity" label="Seat capacity" required type="number" min={1} max={100} value={capacity} onChange={(event) => setCapacity(event.target.value)} />
        {fieldError ? <p className="text-sm text-danger sm:col-span-2">{fieldError}</p> : null}
        {formError ? <div className="sm:col-span-2"><FormAlert message={formError.message} requestId={formError.requestId} /></div> : null}
        {notice ? <div className="sm:col-span-2"><Notice tone="success" message={notice} /></div> : null}
        <div>
          <Button type="submit" loading={pending}>Add bus</Button>
        </div>
      </form>
      <Select id="bus-status" label="Status" options={statusOptions} value={status} onChange={(event) => setStatus(event.target.value as '' | BusStatus)} />
      {buses.isPending ? <LoadingSkeleton lines={5} label="Loading fleet" /> : null}
      {buses.isError ? <LoadFailure title="The fleet could not be loaded" error={buses.error} onRetry={() => void buses.refetch()} /> : null}
      {buses.data ? (
        <DataTable caption="Fleet" columns={columns} rows={buses.data.items} getRowKey={(bus) => bus.id} emptyTitle="No buses" emptyDescription="No buses match this status." />
      ) : null}
      <Modal open={target !== null} title="Deactivate bus?" description="The fleet service marks the bus inactive." onClose={() => { if (!pending) setTarget(null) }}>
        <p className="text-sm text-ink">{target ? `${target.registration_number} · ${target.display_name}` : ''}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setTarget(null)}>Go Back</Button>
          <Button type="button" variant="danger" loading={pending} onClick={() => void confirmDeactivate()}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  )
}

function statusLabel(status: BusStatus): string {
  if (status === 'ACTIVE') return 'Active'
  if (status === 'MAINTENANCE') return 'Maintenance'
  return 'Inactive'
}

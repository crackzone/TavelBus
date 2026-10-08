import { useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { deactivateBus, updateBus } from '../../api/buses.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Modal } from '../../components/ui/Modal.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { useBusQuery } from '../../features/admin/hooks.ts'
import { Notice } from '../../features/passenger/Notice.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { busStatuses, type BusStatus } from '../../types/common.ts'

export function BusPage() {
  const { busId } = useParams()
  const queryClient = useQueryClient()
  const busQuery = useBusQuery(busId)
  const bus = busQuery.data
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [capacity, setCapacity] = useState<string | null>(null)
  const [status, setStatus] = useState<BusStatus | null>(null)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  useDocumentTitle(`${bus?.registration_number ?? 'Bus'} · TravelBus Manager`)

  if (!busId) return <LoadFailure title="Bus reference is missing" error={new Error('Missing bus')} onRetry={() => undefined} />
  if (busQuery.isPending) return <LoadingSkeleton lines={5} label="Loading bus" />
  if (busQuery.isError || !bus) return <LoadFailure title="That bus could not be loaded" error={busQuery.error} onRetry={() => void busQuery.refetch()} />

  const current = bus
  const name = displayName ?? current.display_name
  const seats = capacity ?? String(current.seat_capacity)
  const nextStatus = status ?? current.status

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const seatCount = Number(seats)
    if (name.trim().length < 2 || !Number.isInteger(seatCount) || seatCount < 1 || seatCount > 100) {
      setFieldError('Enter a display name and a seat capacity from 1 to 100.')
      return
    }
    setFieldError(null)
    setFormError(null)
    setPending(true)
    try {
      const updated = await updateBus(current.id, {
        display_name: name.trim(),
        seat_capacity: seatCount,
        status: nextStatus,
      })
      setDisplayName(null)
      setCapacity(null)
      setStatus(null)
      setNotice(`${updated.registration_number} was updated.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['buses'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bus(updated.id) }),
      ])
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  async function confirmDeactivate() {
    setPending(true)
    setFormError(null)
    try {
      const updated = await deactivateBus(current.id)
      setConfirming(false)
      setStatus(null)
      setNotice(`${updated.registration_number} is inactive.`)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['buses'] }),
        queryClient.invalidateQueries({ queryKey: queryKeys.bus(updated.id) }),
      ])
    } catch (error) {
      setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined })
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={current.registration_number}
        description={current.display_name}
        actions={<StatusBadge status={current.status} />}
      />
      <p className="text-sm text-muted">Registration is stored on the bus and is not part of the update request.</p>
      <form className="grid max-w-xl gap-4" onSubmit={(event) => void onSave(event)}>
        <Input id="bus-name" label="Display name" required value={name} onChange={(event) => setDisplayName(event.target.value)} />
        <Input id="bus-capacity" label="Seat capacity" required type="number" min={1} max={100} value={seats} onChange={(event) => setCapacity(event.target.value)} />
        <Select
          id="bus-edit-status"
          label="Status"
          value={nextStatus}
          options={busStatuses.map((item) => ({ value: item, label: item }))}
          onChange={(event) => setStatus(event.target.value as BusStatus)}
        />
        {fieldError ? <p className="text-sm text-danger">{fieldError}</p> : null}
        {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
        {notice ? <Notice tone="success" message={notice} /> : null}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={pending}>Save</Button>
          {current.status !== 'INACTIVE' ? (
            <Button type="button" variant="danger" disabled={pending} onClick={() => setConfirming(true)}>
              Deactivate
            </Button>
          ) : null}
        </div>
      </form>
      <Link to="/admin/fleet" className="focus-ring text-sm font-medium text-brand">Back to fleet</Link>
      <Modal open={confirming} title="Deactivate bus?" description="The fleet service marks the bus inactive." onClose={() => { if (!pending) setConfirming(false) }}>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => setConfirming(false)}>Go Back</Button>
          <Button type="button" variant="danger" loading={pending} onClick={() => void confirmDeactivate()}>Deactivate</Button>
        </div>
      </Modal>
    </div>
  )
}

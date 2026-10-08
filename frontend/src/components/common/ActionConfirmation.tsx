import { useId } from 'react'
import { formatDateTime } from '../../lib/format.ts'
import { Button } from '../ui/Button.tsx'

export type ConfirmationFact = {
  label: string
  value: string
}

export function ActionConfirmation({
  title,
  summary,
  facts,
  expiresAt,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
}: {
  title: string
  summary: string
  facts: readonly ConfirmationFact[]
  expiresAt?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  pending?: boolean
}) {
  const titleId = useId()
  return (
    <section className="rounded-sm border border-warning bg-warning-soft p-4" aria-labelledby={titleId}>
      <p className="text-xs font-semibold uppercase tracking-wide text-warning">Action requires confirmation</p>
      <h2 id={titleId} className="mt-2 text-lg font-semibold text-ink">
        {title}
      </h2>
      <p className="mt-2 text-sm text-ink">{summary}</p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-2">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs text-muted">{fact.label}</dt>
            <dd className="text-sm font-medium text-ink">{fact.value}</dd>
          </div>
        ))}
      </dl>
      {expiresAt ? <p className="mt-4 text-sm text-ink">Proposal expires {formatDateTime(expiresAt)}.</p> : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={pending}>
          {cancelLabel}
        </Button>
        <Button type="button" onClick={onConfirm} loading={pending}>
          {confirmLabel}
        </Button>
      </div>
    </section>
  )
}

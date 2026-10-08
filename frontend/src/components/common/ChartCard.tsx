import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState.tsx'

export function ChartCard({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <section className="rounded-sm border border-line bg-surface p-4 shadow-panel">
      <header>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
      </header>
      <div className="mt-4">
        {children ?? (
          <EmptyState
            titleAs="h3"
            title="No aggregate data"
            description="A chart is shown only when the analytics service returns aggregate values."
          />
        )}
      </div>
    </section>
  )
}

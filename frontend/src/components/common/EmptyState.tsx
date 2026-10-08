import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
  titleAs = 'h2',
}: {
  title: string
  description: string
  action?: ReactNode
  titleAs?: 'h2' | 'h3' | 'p'
}) {
  const Heading = titleAs
  return (
    <div className="rounded-sm border border-dashed border-line bg-surface px-6 py-10 text-center">
      <Heading className="text-lg font-semibold text-ink">{title}</Heading>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

import type { ReactNode } from 'react'

export function ErrorState({
  title,
  message,
  requestId,
  heading = 'h2',
  action,
}: {
  title: string
  message: string
  requestId?: string | null
  heading?: 'h1' | 'h2'
  action?: ReactNode
}) {
  const Heading = heading
  return (
    <div role="alert" className="rounded-sm border border-danger/30 bg-danger-soft px-6 py-8 text-center">
      <Heading className="text-lg font-semibold text-ink">{title}</Heading>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink">{message}</p>
      {requestId ? (
        <p className="mt-3 text-xs text-muted">
          Support reference <span className="font-mono">{requestId}</span>
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function FormAlert({ message, requestId }: { message: string; requestId?: string | null }) {
  return (
    <div role="alert" className="border border-danger/30 bg-danger-soft px-3 py-3 text-sm text-ink">
      <p>{message}</p>
      {requestId ? <p className="mt-1 text-muted">Support reference {requestId}</p> : null}
    </div>
  )
}

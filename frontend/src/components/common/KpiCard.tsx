export function KpiCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-sm border border-line bg-surface p-4 shadow-panel">
      <h3 className="text-sm font-medium text-muted">{label}</h3>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
      {detail ? <p className="mt-2 text-sm text-muted">{detail}</p> : null}
    </article>
  )
}

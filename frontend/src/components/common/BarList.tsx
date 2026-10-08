export function BarList({
  title,
  description,
  items,
  formatValue,
}: {
  title: string
  description: string
  items: readonly { id: string; label: string; value: number }[]
  formatValue: (value: number) => string
}) {
  const peak = items.reduce((highest, item) => Math.max(highest, item.value), 0)

  return (
    <section className="flex flex-col gap-3" aria-label={title}>
      <div>
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-1 text-sm text-muted">{description}</p>
      </div>
      <ul className="grid gap-3">
        {items.map((item) => {
          const width = peak <= 0 ? 0 : Math.max(0, (item.value / peak) * 100)
          const amount = formatValue(item.value)
          return (
            <li key={item.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 text-ink">{item.label}</span>
                <span className="shrink-0 font-medium text-ink">{amount}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-sm bg-brand-soft" role="img" aria-label={`${item.label}, ${amount}`}>
                <div className="h-full bg-brand" style={{ width: `${width}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

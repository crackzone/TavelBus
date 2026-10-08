import type { ReactNode } from 'react'
import { EmptyState } from './EmptyState.tsx'

export type DataColumn<Row> = {
  id: string
  header: string
  cell: (row: Row) => ReactNode
}

export function DataTable<Row>({
  caption,
  columns,
  rows,
  getRowKey,
  emptyTitle,
  emptyDescription,
}: {
  caption: string
  columns: readonly DataColumn<Row>[]
  rows: readonly Row[]
  getRowKey: (row: Row) => string
  emptyTitle: string
  emptyDescription: string
}) {
  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <div>
      <ul className="grid gap-3 xl:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={getRowKey(row)} className="rounded-sm border border-line bg-surface p-4">
            <dl className="grid gap-3">
              {columns.map((column) => (
                <div key={column.id} className="min-w-0">
                  <dt className="text-xs text-muted">{column.header}</dt>
                  <dd className="mt-1 text-sm text-ink">{column.cell(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden min-w-0 overflow-x-auto xl:block">
        <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-b border-line text-muted">
          <tr>
            {columns.map((column) => (
              <th key={column.id} scope="col" className="px-3 py-3 font-medium">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={getRowKey(row)} className="border-b border-line">
              {columns.map((column) => (
                <td key={column.id} className="px-3 py-3 align-top text-ink">
                  {column.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        </table>
      </div>
    </div>
  )
}

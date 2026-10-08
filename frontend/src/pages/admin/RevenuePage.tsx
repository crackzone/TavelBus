import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarList } from '../../components/common/BarList.tsx'
import { DataTable, type DataColumn } from '../../components/common/DataTable.tsx'
import { KpiCard } from '../../components/common/KpiCard.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { DatePicker } from '../../components/ui/DatePicker.tsx'
import { useRevenueByBusQuery, useRevenueByRouteQuery, useRevenueSummaryQuery } from '../../features/admin/hooks.ts'
import { localDayBound } from '../../features/admin/labels.ts'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { formatCurrency } from '../../lib/format.ts'
import type { BusRevenue, RevenueQuery, RouteRevenue } from '../../types/revenue.ts'

export function RevenuePage() {
  useDocumentTitle('Revenue · TravelBus Manager')
  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const rangeInvalid = Boolean(start && end && start > end)
  const filters = useMemo<RevenueQuery>(() => {
    const startDate = start ? localDayBound(start, false) : null
    const endDate = end ? localDayBound(end, true) : null
    return {
      ...(startDate ? { start_date: startDate } : {}),
      ...(endDate ? { end_date: endDate } : {}),
    }
  }, [end, start])
  const summary = useRevenueSummaryQuery(filters, !rangeInvalid)
  const routes = useRevenueByRouteQuery()
  const buses = useRevenueByBusQuery()
  const summaryData = rangeInvalid ? undefined : summary.data

  const routeColumns: readonly DataColumn<RouteRevenue>[] = [
    {
      id: 'route',
      header: 'Route',
      cell: (route) => (
        <Link to={`/admin/routes/${route.route_id}`} className="focus-ring font-medium text-brand">
          {route.route_name}
        </Link>
      ),
    },
    { id: 'origin', header: 'Origin', cell: (route) => route.origin },
    { id: 'destination', header: 'Destination', cell: (route) => route.destination },
    { id: 'trips', header: 'Trips', cell: (route) => String(route.total_trips) },
    { id: 'bookings', header: 'Confirmed bookings', cell: (route) => String(route.confirmed_bookings) },
    { id: 'revenue', header: 'Net revenue', cell: (route) => formatCurrency(route.net_revenue) },
  ]

  const busColumns: readonly DataColumn<BusRevenue>[] = [
    {
      id: 'registration',
      header: 'Registration',
      cell: (bus) => (
        <Link to={`/admin/fleet/${bus.bus_id}`} className="focus-ring font-medium text-brand">
          {bus.registration_number}
        </Link>
      ),
    },
    { id: 'name', header: 'Display name', cell: (bus) => bus.display_name },
    { id: 'trips', header: 'Trips', cell: (bus) => String(bus.total_trips) },
    { id: 'bookings', header: 'Confirmed bookings', cell: (bus) => String(bus.confirmed_bookings) },
    { id: 'revenue', header: 'Net revenue', cell: (bus) => formatCurrency(bus.net_revenue) },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Revenue"
        description="Summary totals follow the selected booking dates. Route and bus figures include every booking."
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <DatePicker
          id="revenue-start"
          label="From"
          value={start}
          onChange={(event) => setStart(event.target.value)}
          hint="Optional. The summary starts at the beginning of this local date."
          error={rangeInvalid ? 'The end date is before the start date.' : undefined}
        />
        <DatePicker
          id="revenue-end"
          label="To"
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          hint="Optional. The summary runs through the end of this local date."
          error={rangeInvalid ? 'The end date is before the start date.' : undefined}
        />
      </div>
      {rangeInvalid ? null : summary.isPending ? <LoadingSkeleton lines={4} label="Loading revenue summary" /> : null}
      {!rangeInvalid && summary.isError ? (
        <LoadFailure title="Revenue summary could not be loaded" error={summary.error} onRetry={() => void summary.refetch()} />
      ) : null}
      {summaryData ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Gross revenue" value={formatCurrency(summaryData.gross_revenue)} />
          <KpiCard label="Refunded revenue" value={formatCurrency(summaryData.refunded_revenue)} />
          <KpiCard label="Net revenue" value={formatCurrency(summaryData.net_revenue)} />
          <KpiCard label="Average booking value" value={formatCurrency(summaryData.average_booking_value)} />
          <KpiCard label="Total bookings" value={String(summaryData.total_bookings)} />
          <KpiCard label="Confirmed bookings" value={String(summaryData.confirmed_bookings)} />
          <KpiCard label="Cancelled bookings" value={String(summaryData.cancelled_bookings)} />
          <KpiCard label="Seats sold" value={String(summaryData.total_seats_sold)} />
        </div>
      ) : null}
      <Breakdown
        title="By route"
        pending={routes.isPending}
        error={routes.error}
        onRetry={() => void routes.refetch()}
        rows={routes.data}
        columns={routeColumns}
        getRowKey={(route) => route.route_id}
        caption="Revenue by route"
        emptyDescription="No route revenue is recorded."
        chartTitle="Net revenue by route"
        chartItems={(routes.data ?? []).map((route) => ({
          id: route.route_id,
          label: route.route_name,
          value: route.net_revenue,
        }))}
      />
      <Breakdown
        title="By bus"
        pending={buses.isPending}
        error={buses.error}
        onRetry={() => void buses.refetch()}
        rows={buses.data}
        columns={busColumns}
        getRowKey={(bus) => bus.bus_id}
        caption="Revenue by bus"
        emptyDescription="No bus revenue is recorded."
        chartTitle="Net revenue by bus"
        chartItems={(buses.data ?? []).map((bus) => ({
          id: bus.bus_id,
          label: `${bus.registration_number} · ${bus.display_name}`,
          value: bus.net_revenue,
        }))}
      />
    </div>
  )
}

function Breakdown<Row>({
  title,
  pending,
  error,
  onRetry,
  rows,
  columns,
  getRowKey,
  caption,
  emptyDescription,
  chartTitle,
  chartItems,
}: {
  title: string
  pending: boolean
  error: unknown
  onRetry: () => void
  rows: readonly Row[] | undefined
  columns: readonly DataColumn<Row>[]
  getRowKey: (row: Row) => string
  caption: string
  emptyDescription: string
  chartTitle: string
  chartItems: readonly { id: string; label: string; value: number }[]
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {pending ? <LoadingSkeleton lines={4} label={`Loading ${title.toLocaleLowerCase()}`} /> : null}
      {error ? <LoadFailure title={`${title} revenue could not be loaded`} error={error} onRetry={onRetry} /> : null}
      {rows && rows.length > 0 ? (
        <BarList
          title={chartTitle}
          description="Bar length compares net revenue in this list."
          items={chartItems}
          formatValue={formatCurrency}
        />
      ) : null}
      {rows ? (
        <DataTable
          caption={caption}
          columns={columns}
          rows={rows}
          getRowKey={getRowKey}
          emptyTitle="No revenue"
          emptyDescription={emptyDescription}
        />
      ) : null}
    </section>
  )
}

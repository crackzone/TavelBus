import { formatSeat } from '../../lib/format.ts'
import { cx } from '../../lib/cx.ts'
import type { TripSeat } from '../../types/bookings.ts'
import { EmptyState } from './EmptyState.tsx'

const SEATS_PER_ROW = 4

export function SeatMap({
  seats,
  selectedSeatNumber = null,
  onSelect,
  disabled = false,
}: {
  seats: readonly TripSeat[]
  selectedSeatNumber?: number | null
  onSelect?: (seatNumber: number) => void
  disabled?: boolean
}) {
  const rows = groupSeats(seats)
  if (rows.length === 0) {
    return <EmptyState title="No seats" description="Seat availability has not been loaded for this trip." />
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="text-sm text-muted">Available seats can be selected. Booked and held seats cannot.</p>
      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-muted" aria-hidden="true">
        <li className="border border-line bg-surface px-2 py-1">Available</li>
        <li className="border border-navy bg-navy px-2 py-1 text-white">Selected</li>
        <li className="border border-line bg-canvas px-2 py-1">Booked</li>
        <li className="border border-warning bg-warning-soft px-2 py-1 text-warning">Held</li>
      </ul>
      <div className="mt-4 rounded-sm border border-line bg-canvas p-4">
        <p className="border border-dashed border-line px-3 py-2 text-center text-xs text-muted">Driver</p>
        <div className="mt-4 grid gap-3" role="group" aria-label="Seat map">
          {rows.map((row, rowIndex) => {
            const left = row.filter((seat) => columnOf(seat) < 2).sort((a, b) => columnOf(a) - columnOf(b))
            const right = row.filter((seat) => columnOf(seat) >= 2).sort((a, b) => columnOf(a) - columnOf(b))
            return (
              <div key={row[0]?.id ?? rowIndex} className="grid grid-cols-[1fr_1fr_1.5rem_1fr_1fr] items-center gap-2">
                <SeatSlot seat={left[0]} selectedSeatNumber={selectedSeatNumber} onSelect={onSelect} disabled={disabled} />
                <SeatSlot seat={left[1]} selectedSeatNumber={selectedSeatNumber} onSelect={onSelect} disabled={disabled} />
                <span className="sr-only">Aisle</span>
                <SeatSlot seat={right[0]} selectedSeatNumber={selectedSeatNumber} onSelect={onSelect} disabled={disabled} />
                <SeatSlot seat={right[1]} selectedSeatNumber={selectedSeatNumber} onSelect={onSelect} disabled={disabled} />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function SeatSlot({
  seat,
  selectedSeatNumber,
  onSelect,
  disabled,
}: {
  seat: TripSeat | undefined
  selectedSeatNumber: number | null
  onSelect?: (seatNumber: number) => void
  disabled: boolean
}) {
  if (!seat) return <span aria-hidden="true" />
  const selected = selectedSeatNumber === seat.seat_number
  const unavailable = seat.status !== 'AVAILABLE' || disabled
  const stateLabel = selected ? 'Selected' : seat.status === 'LOCKED' ? 'Held' : seat.status === 'BOOKED' ? 'Booked' : 'Available'
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-disabled={unavailable}
      aria-label={`Seat ${formatSeat(seat.seat_number)}, ${stateLabel}`}
      onClick={() => {
        if (unavailable) return
        onSelect?.(seat.seat_number)
      }}
      className={cx(
        'focus-ring flex h-11 w-full flex-col items-center justify-center rounded-sm border text-xs font-medium',
        selected && 'border-navy bg-navy text-white',
        !selected && seat.status === 'AVAILABLE' && 'border-line bg-surface text-ink',
        seat.status === 'BOOKED' && 'border-line bg-canvas text-muted',
        seat.status === 'LOCKED' && 'border-warning bg-warning-soft text-warning',
      )}
    >
      {formatSeat(seat.seat_number)}
    </button>
  )
}

function groupSeats(seats: readonly TripSeat[]): TripSeat[][] {
  const rows: TripSeat[][] = []
  for (const seat of [...seats].sort((a, b) => a.seat_number - b.seat_number)) {
    const rowIndex = Math.floor((seat.seat_number - 1) / SEATS_PER_ROW)
    const row = rows[rowIndex] ?? []
    row.push(seat)
    rows[rowIndex] = row
  }
  return rows
}

function columnOf(seat: TripSeat): number {
  return (seat.seat_number - 1) % SEATS_PER_ROW
}

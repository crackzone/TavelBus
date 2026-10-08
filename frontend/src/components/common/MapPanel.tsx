import { formatCoordinate } from '../../lib/format.ts'
import { EmptyState } from './EmptyState.tsx'

export type MapPointKind = 'stop' | 'bus' | 'trail'

export type MapPoint = {
  id: string
  label: string
  latitude: number
  longitude: number
  detail?: string
  kind?: MapPointKind
}

const PLOT_WIDTH = 320
const PLOT_HEIGHT = 200
const PLOT_PAD = 24

export function MapPanel({
  title = 'Map',
  points,
  activePointId,
  emptyMessage = 'Live location is currently unavailable.',
}: {
  title?: string
  points: readonly MapPoint[]
  activePointId?: string
  emptyMessage?: string
}) {
  const listed = points.filter((point) => point.kind !== 'trail')
  const trailCount = points.length - listed.length

  return (
    <section className="rounded-sm border border-line bg-surface p-4 shadow-panel" aria-label={title}>
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {points.length === 0 ? (
        <div className="mt-4">
          <EmptyState titleAs="h3" title="No position" description={emptyMessage} />
        </div>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">Each position is a coordinate returned by the service.</p>
          <PositionPlot points={points} activePointId={activePointId} />
          <ol className="mt-4 grid gap-3">
            {listed.map((point, index) => {
              const current = point.id === activePointId
              return (
                <li
                  key={point.id}
                  className={current ? 'border border-navy bg-brand-soft px-3 py-3' : 'border border-line px-3 py-3'}
                  aria-current={current ? 'true' : undefined}
                >
                  <p className="text-xs text-muted">
                    {kindLabel(point.kind)} · {index + 1}
                    {current ? ' · Current' : ''}
                  </p>
                  <p className="text-sm font-medium text-ink">{point.label}</p>
                  <p className="text-xs text-muted">
                    {formatCoordinate(point.latitude)}, {formatCoordinate(point.longitude)}
                  </p>
                  {point.detail ? <p className="mt-1 text-sm text-ink">{point.detail}</p> : null}
                </li>
              )
            })}
          </ol>
          {trailCount > 0 ? (
            <p className="mt-3 text-sm text-muted">
              Recent positions from the tracking service: {trailCount}.
            </p>
          ) : null}
        </>
      )}
    </section>
  )
}

function PositionPlot({ points, activePointId }: { points: readonly MapPoint[]; activePointId?: string }) {
  const placed = project(points)
  const route = placed.filter((point) => (point.kind ?? 'stop') === 'stop')
  const kinds = new Set(points.map((point) => point.kind ?? 'stop'))

  return (
    <div className="mt-4">
      <svg
        viewBox={`0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`}
        className="h-52 w-full rounded-sm border border-line bg-canvas"
        role="img"
        aria-label="Plot of the coordinates listed below"
      >
        {route.length > 1 ? (
          <polyline
            points={route.map((point) => `${point.x},${point.y}`).join(' ')}
            fill="none"
            stroke="var(--color-line)"
            strokeWidth="2"
          />
        ) : null}
        {placed.map((point) => (
          <PlotMark key={point.id} point={point} active={point.id === activePointId} />
        ))}
      </svg>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
        {kinds.has('stop') ? <li>Square: stop</li> : null}
        {kinds.has('bus') ? <li>Circle: bus</li> : null}
        {kinds.has('trail') ? <li>Dot: recent position</li> : null}
      </ul>
    </div>
  )
}

function PlotMark({
  point,
  active,
}: {
  point: MapPoint & { x: number; y: number }
  active: boolean
}) {
  const kind = point.kind ?? 'stop'
  if (kind === 'trail') {
    return <circle cx={point.x} cy={point.y} r="3" fill="var(--color-brand)" opacity="0.45" />
  }
  if (kind === 'bus') {
    return (
      <g>
        {active ? <circle cx={point.x} cy={point.y} r="12" fill="none" stroke="var(--color-navy)" strokeWidth="2" /> : null}
        <circle cx={point.x} cy={point.y} r="7" fill="var(--color-navy)" />
      </g>
    )
  }
  return <rect x={point.x - 4} y={point.y - 4} width="8" height="8" fill="var(--color-surface)" stroke="var(--color-navy)" strokeWidth="2" />
}

function project(points: readonly MapPoint[]): Array<MapPoint & { x: number; y: number }> {
  const lats = points.map((point) => point.latitude)
  const lons = points.map((point) => point.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLon = Math.min(...lons)
  const maxLon = Math.max(...lons)
  const flatLat = maxLat === minLat
  const flatLon = maxLon === minLon
  const latSpan = Math.max(maxLat - minLat, 0.01)
  const lonSpan = Math.max(maxLon - minLon, 0.01)
  const width = PLOT_WIDTH - PLOT_PAD * 2
  const height = PLOT_HEIGHT - PLOT_PAD * 2

  return points.map((point) => ({
    ...point,
    x: flatLon ? PLOT_WIDTH / 2 : PLOT_PAD + ((point.longitude - minLon) / lonSpan) * width,
    y: flatLat ? PLOT_HEIGHT / 2 : PLOT_PAD + ((maxLat - point.latitude) / latSpan) * height,
  }))
}

function kindLabel(kind: MapPointKind | undefined): string {
  if (kind === 'bus') return 'Bus'
  if (kind === 'trail') return 'Recent'
  return 'Stop'
}

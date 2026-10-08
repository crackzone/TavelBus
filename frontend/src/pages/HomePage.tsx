import { Link } from 'react-router-dom'
import { RouteTimeline, type TimelineStop } from '../components/common/RouteTimeline.tsx'
import { StatusBadge } from '../components/ui/StatusBadge.tsx'
import { ButtonLink } from '../components/ui/Button.tsx'
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts'

const exampleStops: readonly TimelineStop[] = [
  { id: 'bengaluru', name: 'Bengaluru', sequenceNumber: 1 },
  { id: 'mandya', name: 'Mandya', sequenceNumber: 2 },
  { id: 'mysuru', name: 'Mysuru', sequenceNumber: 3 },
]

const workspaces = [
  {
    title: 'Passenger',
    to: '/passenger/dashboard',
    copy: 'Search a trip, choose a seat, and follow the bus attached to your booking.',
    status: 'SCHEDULED',
  },
  {
    title: 'Driver',
    to: '/driver/dashboard',
    copy: 'See assigned trips, start the departure, and send location from the device in the bus.',
    status: 'IN_PROGRESS',
  },
  {
    title: 'Administration',
    to: '/admin',
    copy: 'Run the fleet, routes, schedules, bookings, manifests, and revenue.',
    status: 'ACTIVE',
  },
] as const

export function HomePage() {
  useDocumentTitle('TravelBus Manager')
  return (
    <div>
      <section className="bg-navy text-white" aria-labelledby="home-heading">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)] lg:items-end">
          <div>
            <p className="text-sm font-medium text-on-navy">Intercity bus operations</p>
            <h1 id="home-heading" className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Book the seat. Run the trip. See the fleet.
            </h1>
            <p className="mt-4 max-w-xl text-base text-on-navy">
              TravelBus Manager is the workspace for passengers, drivers, and the team that operates the network.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink to="/login" variant="inverse">
                Sign in
              </ButtonLink>
              <ButtonLink to="/register" variant="inverse-ghost">
                Create account
              </ButtonLink>
            </div>
          </div>
          <div className="bg-surface p-5 text-ink shadow-panel">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Example corridor</p>
            <div className="mt-4">
              <RouteTimeline stops={exampleStops} />
            </div>
            <p className="text-sm text-muted">Sample stops only. This is not a live departure.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12" aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-xl font-semibold text-ink">
          Choose a workspace
        </h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          {workspaces.map((workspace) => (
            <li key={workspace.title}>
              <Link
                to={workspace.to}
                className="focus-ring flex h-full flex-col rounded-sm border border-line bg-surface p-5 shadow-panel hover:border-navy"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-ink">{workspace.title}</h3>
                  <StatusBadge status={workspace.status} />
                </div>
                <p className="mt-3 flex-1 text-sm text-muted">{workspace.copy}</p>
                <p className="mt-6 text-sm font-medium text-navy">Open workspace</p>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-t border-line bg-surface" aria-labelledby="service-heading">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-3">
          <h2 id="service-heading" className="sr-only">
            What this workspace shows
          </h2>
          <article>
            <h3 className="text-base font-semibold text-ink">Seat status comes from the booking service</h3>
            <p className="mt-2 text-sm text-muted">A booked or held seat cannot be selected from the seat map.</p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-ink">Live position follows a location update</h3>
            <p className="mt-2 text-sm text-muted">When no update has arrived, tracking says the location is unavailable.</p>
          </article>
          <article>
            <h3 className="text-base font-semibold text-ink">Revenue stays with administration</h3>
            <p className="mt-2 text-sm text-muted">Fleet, manifests, and totals use the figures returned by the service.</p>
          </article>
        </div>
      </section>
    </div>
  )
}

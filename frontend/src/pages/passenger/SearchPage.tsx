import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TripCard } from '../../components/common/TripCard.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button, ButtonLink } from '../../components/ui/Button.tsx'
import { DatePicker } from '../../components/ui/DatePicker.tsx'
import { Input } from '../../components/ui/Input.tsx'
import { Select } from '../../components/ui/Select.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { LoadFailure } from '../../features/passenger/LoadFailure.tsx'
import { usePublicRoutesQuery, usePublicTripQuery, useTripSeatsQuery } from '../../features/passenger/hooks.ts'
import { isTripReference, matchingRoutes, placeNames, tripMatchesSearch } from '../../features/passenger/match.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatDate, formatDuration } from '../../lib/format.ts'
import type { Route } from '../../types/routes.ts'

type SearchErrors = Partial<Record<'from' | 'to' | 'date', string>>

export function SearchPage() {
  useDocumentTitle('Search trips · TravelBus Manager')
  const routesQuery = usePublicRoutesQuery()
  const [params, setParams] = useSearchParams()
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const date = params.get('date') ?? ''
  const tripReference = params.get('trip') ?? ''
  const searched = from !== '' && to !== '' && date !== ''
  const [draft, setDraft] = useState({ from, to, date })
  const [errors, setErrors] = useState<SearchErrors>({})
  const routes = useMemo(() => routesQuery.data?.items ?? [], [routesQuery.data])
  const origins = useMemo(() => placeNames(routes, 'origin'), [routes])
  const destinations = useMemo(() => placeNames(routes, 'destination', draft.from), [routes, draft.from])
  const matches = searched ? matchingRoutes(routes, from, to) : []

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = validateSearch(draft)
    setErrors(next)
    const invalid = Object.keys(next)[0]
    if (invalid) {
      document.getElementById(invalid)?.focus()
      return
    }
    setParams({ from: draft.from, to: draft.to, date: draft.date })
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Search trips"
        description="Choose an origin, destination, and travel date. Active routes come from the route service. Departures are opened with a trip reference because the public service does not list them."
      />
      {routesQuery.isPending ? <LoadingSkeleton lines={4} label="Loading routes" /> : null}
      {routesQuery.isError ? (
        <LoadFailure title="Routes could not be loaded" error={routesQuery.error} onRetry={() => void routesQuery.refetch()} />
      ) : null}
      {routesQuery.isSuccess ? (
        <form className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" onSubmit={onSearch} noValidate>
          <Select
            id="from"
            label="From"
            required
            value={draft.from}
            placeholder="Choose an origin"
            options={origins.map((name) => ({ value: name, label: name }))}
            error={errors.from}
            onChange={(event) => {
              const value = event.target.value
              setDraft((current) => ({
                ...current,
                from: value,
                to: placeNames(routes, 'destination', value).includes(current.to) ? current.to : '',
              }))
            }}
          />
          <Select
            id="to"
            label="To"
            required
            value={draft.to}
            placeholder="Choose a destination"
            options={destinations.map((name) => ({ value: name, label: name }))}
            error={errors.to}
            onChange={(event) => setDraft((current) => ({ ...current, to: event.target.value }))}
          />
          <DatePicker
            id="date"
            label="Travel date"
            required
            value={draft.date}
            error={errors.date}
            onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
          />
          <div className="flex items-end">
            <Button type="submit" className="w-full">
              Search Trips
            </Button>
          </div>
        </form>
      ) : null}
      {searched && routesQuery.isSuccess ? (
        <SearchResults matches={matches} from={from} to={to} date={date} tripReference={tripReference} />
      ) : null}
    </div>
  )
}

function SearchResults({
  matches,
  from,
  to,
  date,
  tripReference,
}: {
  matches: readonly Route[]
  from: string
  to: string
  date: string
  tripReference: string
}) {
  const [params, setParams] = useSearchParams()
  const [reference, setReference] = useState(tripReference)
  const [referenceError, setReferenceError] = useState<string | null>(null)
  const travelDate = formatDate(`${date}T00:00:00`)

  function onLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = reference.trim()
    if (!isTripReference(next)) {
      setReferenceError('Enter the trip reference from the service. It is a UUID.')
      document.getElementById('trip')?.focus()
      return
    }
    setReferenceError(null)
    const nextParams = new URLSearchParams(params)
    nextParams.set('trip', next)
    setParams(nextParams)
  }

  return (
    <section className="flex flex-col gap-4" aria-labelledby="search-results-heading">
      <h2 id="search-results-heading" className="text-lg font-semibold text-ink">
        Results for {from} to {to}
      </h2>
      {matches.length === 0 ? (
        <EmptyState title="No routes match this search" description="No active route uses that origin and destination." />
      ) : (
        <>
          <p className="text-sm text-muted">
            {matches.length === 1 ? '1 active route matches.' : `${matches.length} active routes match.`} The public service
            does not list departures for {travelDate}. Open a trip reference to see the departure, fare, and seats.
          </p>
          <ul className="grid gap-4">
            {matches.map((route) => (
              <li key={route.id}>
                <article className="rounded-sm border border-line bg-surface p-4 shadow-panel">
                  <h3 className="text-base font-semibold text-ink">
                    {route.origin} to {route.destination}
                  </h3>
                  <p className="mt-1 text-sm text-muted">{route.name}</p>
                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-muted">Estimated route time</dt>
                      <dd className="mt-1 text-ink">
                        {route.estimated_duration_minutes ? formatDuration(route.estimated_duration_minutes) : 'Not provided'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted">Distance</dt>
                      <dd className="mt-1 text-ink">{route.distance_km == null ? 'Not provided' : `${route.distance_km} km`}</dd>
                    </div>
                  </dl>
                </article>
              </li>
            ))}
          </ul>
          <form className="grid gap-4 rounded-sm border border-line bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={onLookup} noValidate>
            <Input
              id="trip"
              label="Trip reference"
              hint="Optional. Loads that departure when it belongs to a matching route on the travel date."
              value={reference}
              error={referenceError ?? undefined}
              autoCapitalize="none"
              spellCheck={false}
              onChange={(event) => setReference(event.target.value)}
            />
            <div className="flex items-end">
              <Button type="submit">Show departure</Button>
            </div>
          </form>
          {tripReference ? <TripLookup matches={matches} tripReference={tripReference} travelDate={date} /> : null}
        </>
      )}
    </section>
  )
}

function TripLookup({
  matches,
  tripReference,
  travelDate,
}: {
  matches: readonly Route[]
  tripReference: string
  travelDate: string
}) {
  const tripQuery = usePublicTripQuery(isTripReference(tripReference) ? tripReference : undefined)
  const matchedRoute = tripQuery.data ? tripMatchesSearch(tripQuery.data, matches, travelDate) : null
  const seatsQuery = useTripSeatsQuery(matchedRoute ? tripQuery.data?.id : undefined)

  if (!isTripReference(tripReference)) {
    return <FormAlert message="That trip reference is not a valid UUID." />
  }
  if (tripQuery.isPending) return <LoadingSkeleton lines={3} label="Loading trip" />
  if (tripQuery.isError) {
    return <LoadFailure title="That trip could not be loaded" error={tripQuery.error} onRetry={() => void tripQuery.refetch()} />
  }
  if (!tripQuery.data || !matchedRoute) {
    return (
      <EmptyState
        title="This trip is not in the search"
        description="The trip is missing, it is on another route, or it does not depart on the travel date."
      />
    )
  }

  const available = seatsQuery.data?.filter((seat) => seat.status === 'AVAILABLE').length
  const availability = seatsQuery.isPending
    ? 'Checking seats'
    : seatsQuery.isError
      ? 'Seat availability could not be loaded'
      : available === undefined
        ? 'Seat availability could not be loaded'
        : `${available} of ${seatsQuery.data?.length ?? 0} seats available`

  return (
    <div className="flex flex-col gap-3">
      <TripCard
        origin={matchedRoute.origin}
        destination={matchedRoute.destination}
        departure={tripQuery.data.departure_time}
        arrival={tripQuery.data.arrival_time}
        fare={tripQuery.data.fare}
        status={tripQuery.data.status}
        detail={availability}
        action={
          <div className="flex flex-wrap gap-2">
            <ButtonLink to={`/passenger/trips/${tripQuery.data.id}`}>View trip</ButtonLink>
            <ButtonLink to={`/passenger/trips/${tripQuery.data.id}/seats`} variant="secondary">
              Select seat
            </ButtonLink>
          </div>
        }
      />
      {seatsQuery.isError ? (
        <FormAlert message={getErrorMessage(seatsQuery.error)} requestId={isApiError(seatsQuery.error) ? seatsQuery.error.requestId : undefined} />
      ) : null}
    </div>
  )
}

function validateSearch(input: { from: string; to: string; date: string }): SearchErrors {
  const errors: SearchErrors = {}
  if (!input.from) errors.from = 'Choose an origin.'
  if (!input.to) errors.to = 'Choose a destination.'
  if (input.from && input.to && input.from === input.to) errors.to = 'Choose a different destination.'
  if (!input.date) errors.date = 'Choose a travel date.'
  return errors
}

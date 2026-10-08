import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ChatMessage } from '../../components/common/ChatMessage.tsx'
import { EmptyState } from '../../components/common/EmptyState.tsx'
import { PageHeader } from '../../components/common/PageHeader.tsx'
import { LoadingSkeleton } from '../../components/feedback/LoadingSkeleton.tsx'
import { Button } from '../../components/ui/Button.tsx'
import { StatusBadge } from '../../components/ui/StatusBadge.tsx'
import { Field } from '../../components/ui/field.tsx'
import { controlClass, describedBy } from '../../components/ui/field-styles.ts'
import { ActionDesk } from '../../features/assistant/ActionDesk.tsx'
import { FormAlert } from '../../features/auth/FormAlert.tsx'
import { sendChat } from '../../api/assistant.ts'
import {
  assistantTurn,
  clearTranscript,
  loadTranscript,
  saveTranscript,
  suggestedPrompts,
  userTurn,
  type AssistantLocation,
  type TranscriptItem,
} from '../../features/assistant/transcript.ts'
import { isTripReference } from '../../features/passenger/match.ts'
import { useDocumentTitle } from '../../hooks/useDocumentTitle.ts'
import { getErrorMessage, isApiError } from '../../lib/api-error.ts'
import { formatCoordinate, formatCurrency, formatSpeed } from '../../lib/format.ts'

const MESSAGE_LIMIT = 1000

export function AssistantPage({ audience }: { audience: 'passenger' | 'admin' }) {
  useDocumentTitle('AI Assistant · TravelBus Manager')
  const [messages, setMessages] = useState<TranscriptItem[]>(() => loadTranscript(audience))
  const [draft, setDraft] = useState('')
  const [formError, setFormError] = useState<{ message: string; requestId?: string } | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const chat = useMutation({
    mutationFn: (message: string) => sendChat({ message }),
  })

  useEffect(() => {
    saveTranscript(audience, messages)
  }, [audience, messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [messages, chat.isPending])

  function send(text: string) {
    const message = text.trim()
    if (!message) {
      setFormError({ message: 'Enter a message.' })
      return
    }
    if (message.length > MESSAGE_LIMIT) {
      setFormError({ message: 'Use 1000 characters or fewer.' })
      return
    }
    setFormError(null)
    setDraft('')
    setMessages((current) => [...current, userTurn(message)])
    chat.mutate(message, {
      onSuccess: (data) => setMessages((current) => [...current, assistantTurn(data)]),
      onError: (error) => setFormError({ message: getErrorMessage(error), requestId: isApiError(error) ? error.requestId : undefined }),
    })
  }

  function clear() {
    if (chat.isPending) return
    clearTranscript(audience)
    setMessages([])
    setFormError(null)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="AI Assistant"
        description="Ask about policy, your bookings, live location, and scheduled trips. A seat changes only after you confirm a proposal."
        actions={
          messages.length > 0 ? (
            <Button type="button" variant="secondary" disabled={chat.isPending} onClick={clear}>
              Clear chat
            </Button>
          ) : null
        }
      />
      <div className="flex flex-wrap gap-2">
        {suggestedPrompts.map((prompt) => (
          <Button key={prompt} type="button" variant="secondary" disabled={chat.isPending} onClick={() => send(prompt)}>
            {prompt}
          </Button>
        ))}
      </div>
      <div className="flex flex-col gap-3" aria-live="polite">
        {messages.length === 0 ? (
          <EmptyState title="No messages yet" description="Choose a suggested question or type your own." />
        ) : (
          messages.map((item) => (
            <ChatMessage key={item.id} kind={item.kind} content={item.text}>
              {hasDetail(item) ? <StructuredReply item={item} audience={audience} /> : null}
            </ChatMessage>
          ))
        )}
        {chat.isPending ? <LoadingSkeleton lines={3} label="Waiting for the assistant" /> : null}
        <div ref={bottomRef} />
      </div>
      {formError ? <FormAlert message={formError.message} requestId={formError.requestId} /> : null}
      <ActionDesk audience={audience} />
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          send(draft)
        }}
      >
        <Field htmlFor="assistant-message" label="Message" hint="Up to 1000 characters." required>
          <textarea
            id="assistant-message"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            required
            maxLength={MESSAGE_LIMIT}
            rows={3}
            disabled={chat.isPending}
            aria-describedby={describedBy('assistant-message', 'Up to 1000 characters.', undefined)}
            className={controlClass}
          />
        </Field>
        <div>
          <Button type="submit" loading={chat.isPending}>
            Send
          </Button>
        </div>
      </form>
    </div>
  )
}

function StructuredReply({ item, audience }: { item: TranscriptItem; audience: 'passenger' | 'admin' }) {
  if (item.bookings && item.bookings.length > 0) {
    return (
      <ul className="grid gap-2">
        {item.bookings.map((booking) => (
          <li key={booking.reference} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-mono text-xs">{booking.reference}</span>
            <span>Seat {booking.seat}</span>
            <StatusBadge status={booking.status} />
          </li>
        ))}
      </ul>
    )
  }
  if (item.trips && item.trips.length > 0) {
    return (
      <ul className="grid gap-2">
        {item.trips.map((trip) => (
          <li key={trip.tripId} className="text-sm">
            {isTripReference(trip.tripId) ? (
              <Link to={tripHref(audience, trip.tripId)} className="focus-ring font-medium text-brand">
                {trip.route}
              </Link>
            ) : (
              <span className="font-medium">{trip.route}</span>
            )}
            {trip.fare !== null ? <span className="ml-2">· {formatCurrency(trip.fare)}</span> : null}
          </li>
        ))}
      </ul>
    )
  }
  if (item.location && hasCoordinates(item.location)) {
    return (
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Latitude</dt>
          <dd>{formatCoordinate(item.location.latitude)}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium uppercase tracking-wide text-muted">Longitude</dt>
          <dd>{formatCoordinate(item.location.longitude)}</dd>
        </div>
        {item.location.speedKmph !== null ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Speed</dt>
            <dd>{formatSpeed(item.location.speedKmph)}</dd>
          </div>
        ) : null}
        {item.location.status ? (
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-muted">Trip status</dt>
            <dd><StatusBadge status={item.location.status} /></dd>
          </div>
        ) : null}
      </dl>
    )
  }
  return null
}

function hasDetail(item: TranscriptItem): boolean {
  return Boolean(item.bookings?.length || item.trips?.length || (item.location && hasCoordinates(item.location)))
}

function hasCoordinates(location: AssistantLocation): location is AssistantLocation & { latitude: number; longitude: number } {
  return location.latitude !== null && location.longitude !== null
}

function tripHref(audience: 'passenger' | 'admin', tripId: string): string {
  return audience === 'admin' ? `/admin/trips/${tripId}` : `/passenger/trips/${tripId}`
}

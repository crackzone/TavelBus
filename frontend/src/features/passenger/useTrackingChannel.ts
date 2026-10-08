import { useEffect, useRef, useState } from 'react'
import { parseTrackingStreamData, trackingEventsUrl, trackingWebSocketUrl } from '../../api/tracking.ts'
import type { ConnectionState } from '../../types/common.ts'
import type { TrackingStreamEvent } from '../../types/tracking.ts'

export function useTrackingChannel(
  tripId: string | undefined,
  enabled: boolean,
  onEvent: (event: TrackingStreamEvent) => void,
): ConnectionState {
  const onEventRef = useRef(onEvent)
  const [state, setState] = useState<ConnectionState>('DISCONNECTED')

  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (!enabled || !tripId) return
    let cancelled = false
    let source: EventSource | null = null
    let socket: WebSocket | null = null
    let retryTimer = 0
    let socketAttempt = 0
    let socketOpened = false
    let usingStream = false

    const deliver = (data: string) => {
      const event = parseTrackingStreamData(data)
      if (event) onEventRef.current(event)
    }

    const scheduleSocketRetry = () => {
      socketAttempt += 1
      setState('RECONNECTING')
      window.clearTimeout(retryTimer)
      const delay = Math.min(15_000, 1000 * 2 ** Math.min(socketAttempt, 4))
      retryTimer = window.setTimeout(connectSocket, delay)
    }

    const connectStream = () => {
      if (cancelled || usingStream) return
      usingStream = true
      if (typeof EventSource === 'undefined') {
        scheduleSocketRetry()
        usingStream = false
        return
      }
      setState('RECONNECTING')
      source = new EventSource(trackingEventsUrl(tripId))
      source.onopen = () => {
        if (!cancelled) setState('CONNECTED')
      }
      source.onmessage = (message) => deliver(message.data)
      source.onerror = () => {
        if (!cancelled) setState('RECONNECTING')
      }
    }

    const connectSocket = () => {
      if (cancelled || usingStream) return
      setState(socketOpened ? 'RECONNECTING' : 'CONNECTING')
      let openedThisAttempt = false
      try {
        socket = new WebSocket(trackingWebSocketUrl(tripId))
      } catch {
        connectStream()
        return
      }
      socket.onopen = () => {
        if (cancelled) return
        openedThisAttempt = true
        socketOpened = true
        socketAttempt = 0
        setState('CONNECTED')
      }
      socket.onmessage = (message) => {
        if (typeof message.data === 'string') deliver(message.data)
      }
      socket.onclose = () => {
        if (cancelled || usingStream) return
        if (!openedThisAttempt && !socketOpened) {
          connectStream()
          return
        }
        scheduleSocketRetry()
      }
    }

    if (typeof WebSocket === 'undefined') connectStream()
    else connectSocket()

    return () => {
      cancelled = true
      window.clearTimeout(retryTimer)
      source?.close()
      if (socket && socket.readyState !== WebSocket.CLOSED) socket.close()
    }
  }, [enabled, tripId])

  if (!enabled || !tripId) return 'DISCONNECTED'
  return state === 'DISCONNECTED' ? 'CONNECTING' : state
}

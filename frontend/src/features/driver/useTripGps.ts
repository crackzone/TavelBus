import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { recordDriverLocation } from '../../api/tracking.ts'
import { queryKeys } from '../../api/query-keys.ts'
import { getErrorMessage } from '../../lib/api-error.ts'
import type { GpsLocationCreate } from '../../types/tracking.ts'

const SEND_INTERVAL_MS = 15_000

export type GpsPhase = 'idle' | 'watching' | 'denied' | 'unavailable' | 'timeout' | 'unsupported'

export function useTripGps(tripId: string | undefined, enabled: boolean, attempt = 0) {
  const queryClient = useQueryClient()
  const requestKey = enabled && tripId ? `${tripId}:${attempt}` : ''
  const [trackedKey, setTrackedKey] = useState(requestKey)
  const [phase, setPhase] = useState<GpsPhase>('idle')
  const [lastFixAt, setLastFixAt] = useState<number | null>(null)
  const [lastSentAt, setLastSentAt] = useState<number | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)

  if (trackedKey !== requestKey) {
    setTrackedKey(requestKey)
    setPhase('idle')
    setLastFixAt(null)
    setLastSentAt(null)
    setLastError(null)
  }

  useEffect(() => {
    if (!requestKey || !tripId || !('geolocation' in navigator)) return

    let cancelled = false
    let inFlight = false
    let lastSent = 0
    let timer = 0
    let latest: GeolocationPosition | null = null

    const flush = () => {
      if (cancelled || inFlight || !latest) return
      const wait = lastSent === 0 ? 0 : SEND_INTERVAL_MS - (Date.now() - lastSent)
      if (wait > 0) {
        if (timer) return
        timer = window.setTimeout(() => {
          timer = 0
          flush()
        }, wait)
        return
      }

      const position = latest
      inFlight = true
      const body = toLocation(position)
      void recordDriverLocation(tripId, body)
        .then(() => {
          if (cancelled) return
          lastSent = Date.now()
          setLastSentAt(lastSent)
          setLastError(null)
          void queryClient.invalidateQueries({ queryKey: queryKeys.tripLocation(tripId) })
        })
        .catch((error: unknown) => {
          if (!cancelled) setLastError(getErrorMessage(error))
        })
        .finally(() => {
          inFlight = false
          if (!cancelled && latest && latest.timestamp !== position.timestamp) flush()
        })
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (cancelled) return
        latest = position
        setPhase('watching')
        setLastFixAt(position.timestamp)
        flush()
      },
      (error) => {
        if (cancelled) return
        if (error.code === error.PERMISSION_DENIED) setPhase('denied')
        else if (error.code === error.POSITION_UNAVAILABLE) setPhase('unavailable')
        else setPhase('timeout')
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 },
    )

    return () => {
      cancelled = true
      window.clearTimeout(timer)
      navigator.geolocation.clearWatch(watchId)
    }
  }, [queryClient, requestKey, tripId])

  if (!enabled || !tripId) return { phase: 'idle' as const, lastFixAt: null, lastSentAt: null, lastError: null }
  if (!('geolocation' in navigator)) return { phase: 'unsupported' as const, lastFixAt: null, lastSentAt: null, lastError: null }
  return { phase, lastFixAt, lastSentAt, lastError }
}

function toLocation(position: GeolocationPosition): GpsLocationCreate {
  const { latitude, longitude, speed, heading } = position.coords
  const body: GpsLocationCreate = {
    latitude,
    longitude,
    recorded_at: new Date(position.timestamp).toISOString(),
  }
  if (typeof speed === 'number' && Number.isFinite(speed) && speed >= 0) {
    body.speed_kmph = Math.round(speed * 3.6 * 10) / 10
  }
  if (typeof heading === 'number' && Number.isFinite(heading) && heading >= 0 && heading <= 360) {
    body.heading = heading
  }
  return body
}

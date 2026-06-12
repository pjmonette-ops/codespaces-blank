import { useEffect, useState, useCallback } from 'react'

export type UserLocation = {
  latitude: number
  longitude: number
  timestamp: number
  accuracy: number
  heading?: number
  speed?: number
}

export type LocationTrackingOptions = {
  enableHighAccuracy?: boolean
  maximumAge?: number
  timeout?: number
  onLocationUpdate?: (location: UserLocation) => void
  onError?: (error: string) => void
}

export function useLocationTracking(options: LocationTrackingOptions = {}) {
  const {
    enableHighAccuracy = true,
    maximumAge = 5000,
    timeout = 10000,
    onLocationUpdate,
    onError
  } = options

  const [location, setLocation] = useState<UserLocation | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isWatching, setIsWatching] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      const errorMsg = 'Geolocation not supported'
      setError(errorMsg)
      onError?.(errorMsg)
      return
    }

    setIsWatching(true)

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation: UserLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          accuracy: position.coords.accuracy,
          heading: position.coords.heading || undefined,
          speed: position.coords.speed || undefined
        }
        setLocation(newLocation)
        setError(null)
        onLocationUpdate?.(newLocation)
      },
      (error) => {
        console.error('Location error:', error)
        let errorMessage = 'Unable to retrieve location'

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage =
              'Location permission denied. Please enable in device settings.'
            break
          case error.POSITION_UNAVAILABLE:
            errorMessage =
              'Location unavailable. Please check your GPS signal.'
            break
          case error.TIMEOUT:
            errorMessage = 'Location request timed out. Retrying...'
            break
        }

        setError(errorMessage)
        onError?.(errorMessage)
      },
      {
        enableHighAccuracy,
        maximumAge,
        timeout
      }
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
      setIsWatching(false)
    }
  }, [enableHighAccuracy, maximumAge, timeout, onLocationUpdate, onError])

  return { location, error, isWatching }
}

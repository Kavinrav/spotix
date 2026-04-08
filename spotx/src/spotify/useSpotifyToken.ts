import { useEffect, useState } from 'react'
import { getStoredAccessToken, getStoredExpiresAt, isTokenExpired } from './spotifyAuth'

export function useSpotifyToken() {
  const [token, setToken] = useState<string | null>(() => getStoredAccessToken())

  useEffect(() => {
    const expiresAt = getStoredExpiresAt()
    if (!token || isTokenExpired(expiresAt)) {
      setToken(null)
      return
    }
  }, [token])

  function refreshTokenFromStorage() {
    const next = getStoredAccessToken()
    setToken(next)
  }

  return { token, refreshTokenFromStorage }
}


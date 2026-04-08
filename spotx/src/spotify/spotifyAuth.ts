import { challengeFromVerifier, randomState, randomVerifier } from './pkce'
import { spotifyAuthUrl } from './spotifyApi'

export const SPOTIFY_SCOPE =
  'user-library-read user-library-modify playlist-modify-private playlist-modify-public playlist-read-private user-read-email'

export function isTokenExpired(expiresAtStr: string | null): boolean {
  if (!expiresAtStr) return true
  const t = Number(expiresAtStr)
  if (!Number.isFinite(t)) return true
  return Date.now() > t
}

export function startSpotifyLogin(): void {
  const verifier = randomVerifier()
  const state = randomState()
  void challengeFromVerifier(verifier).then((challenge) => {
    sessionStorage.setItem('spotx.spotify.verifier', verifier)
    sessionStorage.setItem('spotx.spotify.state', state)

    const url = spotifyAuthUrl({
      state,
      codeChallenge: challenge,
      scope: SPOTIFY_SCOPE,
    })

    window.location.href = url
  })
}

export function getStoredAccessToken(): string | null {
  return localStorage.getItem('spotx.spotify.accessToken')
}

export function getStoredExpiresAt(): string | null {
  return localStorage.getItem('spotx.spotify.expiresAt')
}


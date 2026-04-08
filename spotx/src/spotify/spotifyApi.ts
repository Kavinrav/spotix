export type SpotifyTrack = {
  id: string
  uri: string
  name: string
  artists: { name: string }[]
  album: { name: string; images: { url: string }[] }
}

export type SpotifySavedTrackItem = {
  track: SpotifyTrack
}

export type SpotifySearchResponse = {
  tracks: { items: SpotifyTrack[] }
}

export type SpotifyPlaylist = {
  id: string
  name: string
}

const clientId = '21c9a47b4e114ec2b08fe6d5dcf241cc'
const redirectUri = 'http://127.0.0.1:5173/callback'

const ACCOUNTS_AUTH = 'https://accounts.spotify.com/authorize'
const ACCOUNTS_TOKEN = 'https://accounts.spotify.com/api/token'
const SPOTIFY_API = 'https://api.spotify.com/v1'

export const spotifyConstants = {
  clientId,
  redirectUri,
  ACCOUNTS_AUTH,
  ACCOUNTS_TOKEN,
  SPOTIFY_API,
}

export function spotifyAuthUrl(params: {
  state: string
  codeChallenge: string
  scope: string
}): string {
  const u = new URL(ACCOUNTS_AUTH)
  u.searchParams.set('response_type', 'code')
  u.searchParams.set('client_id', clientId)
  u.searchParams.set('redirect_uri', redirectUri)
  u.searchParams.set('state', params.state)
  u.searchParams.set('code_challenge_method', 'S256')
  u.searchParams.set('code_challenge', params.codeChallenge)
  u.searchParams.set('scope', params.scope)
  return u.toString()
}

export async function exchangeCodeForToken(params: {
  code: string
  codeVerifier: string
}): Promise<{ access_token: string; expires_in: number }> {
  const body = new URLSearchParams()
  body.set('grant_type', 'authorization_code')
  body.set('code', params.code)
  body.set('redirect_uri', redirectUri)
  body.set('client_id', clientId)
  body.set('code_verifier', params.codeVerifier)

  const res = await fetch(ACCOUNTS_TOKEN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  const data = (await res.json()) as any
  if (!res.ok) {
    const msg = data?.error_description ?? data?.error ?? 'Spotify token exchange failed'
    throw new Error(msg)
  }

  return { access_token: data.access_token, expires_in: data.expires_in }
}

export async function spotifySearchTracks(params: { token: string; query: string }): Promise<SpotifyTrack[]> {
  const q = params.query.trim()
  if (!q) return []

  const res = await fetch(`${SPOTIFY_API}/search?type=track&limit=10&q=${encodeURIComponent(q)}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })

  const data = (await res.json()) as any
  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Search failed')
  }

  const items = (data?.tracks?.items ?? []) as SpotifyTrack[]
  return items
}

export async function spotifyGetMyPlaylists(params: { token: string }): Promise<SpotifyPlaylist[]> {
  const res = await fetch(`${SPOTIFY_API}/me/playlists?limit=50`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await res.json()) as any
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load playlists')
  return (data?.items ?? []).map((p: any) => ({ id: p.id as string, name: p.name as string }))
}

export async function spotifyGetLiked(params: { token: string; trackIds: string[] }): Promise<boolean[]> {
  const ids = params.trackIds.join(',')
  const res = await fetch(`${SPOTIFY_API}/me/tracks/contains?ids=${encodeURIComponent(ids)}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  const data = (await res.json()) as any
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to load liked state')
  return (data as boolean[]) ?? []
}

export async function spotifyGetLikedTracks(params: { token: string; limit?: number; offset?: number }): Promise<SpotifyTrack[]> {
  const limit = params.limit ?? 20
  const offset = params.offset ?? 0
  const res = await fetch(`${SPOTIFY_API}/me/tracks?limit=${limit}&offset=${offset}`, {
    headers: { Authorization: `Bearer ${params.token}` },
  })
  
  const text = await res.text()
  let data: any
  try {
    data = JSON.parse(text)
  } catch (err) {
    throw new Error(`Spotify API returned non-JSON. Text: ${text.slice(0, 150)}...`)
  }

  if (!res.ok) {
    throw new Error(data?.error?.message ?? 'Failed to load liked tracks')
  }
  const items = (data?.items ?? []) as any[]
  return items.map((it) => it.track as SpotifyTrack)
}

export async function spotifyLikeTracks(params: { token: string; trackIds: string[] }) {
  const ids = params.trackIds.join(',')
  const res = await fetch(`${SPOTIFY_API}/me/tracks?ids=${encodeURIComponent(ids)}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${params.token}` },
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as any
    throw new Error(data?.error?.message ?? 'Failed to like tracks')
  }
}

export async function spotifyUnlikeTracks(params: { token: string; trackIds: string[] }) {
  const ids = params.trackIds.join(',')
  const res = await fetch(`${SPOTIFY_API}/me/tracks?ids=${encodeURIComponent(ids)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${params.token}` },
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as any
    throw new Error(data?.error?.message ?? 'Failed to unlike tracks')
  }
}

export async function spotifyAddTrackToPlaylist(params: { token: string; playlistId: string; trackUri: string }) {
  const res = await fetch(`${SPOTIFY_API}/playlists/${params.playlistId}/tracks`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ uris: [params.trackUri] }),
  })
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as any
    throw new Error(data?.error?.message ?? 'Failed to add track')
  }
}

export function openSpotifyTrack(trackId: string) {
  // Deep link would be `spotify:track:${trackId}`, but web link is safer for browsers.
  window.open(`https://open.spotify.com/track/${trackId}`, '_blank', 'noopener,noreferrer')
}

export function openSpotifyPlaylist(playlistId: string) {
  window.open(`https://open.spotify.com/playlist/${playlistId}`, '_blank', 'noopener,noreferrer')
}


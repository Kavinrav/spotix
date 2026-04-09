import { useEffect, useMemo, useState } from 'react'
import { openSpotifyTrack, spotifyAddTrackToPlaylist, spotifyGetLiked, spotifyGetMyPlaylists, spotifyLikeTracks, spotifySearchTracks, spotifyUnlikeTracks, type SpotifyPlaylist, type SpotifyTrack } from '../spotify/spotifyApi'
import { getStoredAccessToken, getStoredExpiresAt, isTokenExpired, startSpotifyLogin } from '../spotify/spotifyAuth'

export default function Search() {
  const [token, setToken] = useState<string | null>(() => getStoredAccessToken())
  const [searchQ, setSearchQ] = useState('')
  const [results, setResults] = useState<SpotifyTrack[]>([])
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [playlists, setPlaylists] = useState<SpotifyPlaylist[]>([])
  const [playlistPickFor, setPlaylistPickFor] = useState<string | null>(null)
  const [pickedPlaylistId, setPickedPlaylistId] = useState<string>('')
  const [status, setStatus] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const expiresAt = getStoredExpiresAt()
    if (!token || isTokenExpired(expiresAt)) {
      setToken(null)
      return
    }
  }, [token])

  async function runSearch() {
    const q = searchQ.trim()
    if (!q) return
    if (!token) {
      setStatus('Please sign in to Spotify first.')
      return
    }

    setBusy(true)
    setStatus(null)
    try {
      const items = await spotifySearchTracks({ token, query: q })
      setResults(items)

      // Preload liked state for first batch.
      const ids = items.map((t) => t.id).slice(0, 10)
      const likedArr = await spotifyGetLiked({ token, trackIds: ids })
      const map: Record<string, boolean> = {}
      ids.forEach((id, i) => {
        map[id] = Boolean(likedArr[i])
      })
      setLiked(map)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setBusy(false)
    }
  }

  const resultsInfo = useMemo(() => {
    if (!searchQ.trim()) return null
    return `${results.length} result(s)`
  }, [results.length, searchQ])

  async function ensurePlaylistsLoaded() {
    if (!token) return
    if (playlists.length > 0) return
    const pls = await spotifyGetMyPlaylists({ token })
    setPlaylists(pls)
  }

  async function toggleLike(trackId: string) {
    if (!token) return
    setBusy(true)
    try {
      const currentlyLiked = liked[trackId] === true
      if (currentlyLiked) await spotifyUnlikeTracks({ token, trackIds: [trackId] })
      else await spotifyLikeTracks({ token, trackIds: [trackId] })
      setLiked((prev) => ({ ...prev, [trackId]: !currentlyLiked }))
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Like/unlike failed')
    } finally {
      setBusy(false)
    }
  }

  async function addToPlaylist(track: SpotifyTrack, playlistId: string) {
    if (!token) return
    setBusy(true)
    setStatus(null)
    try {
      await spotifyAddTrackToPlaylist({ token, playlistId, trackUri: track.uri })
      setStatus(`Added to playlist.`)
      setPlaylistPickFor(null)
      setPickedPlaylistId('')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Add to playlist failed')
    } finally {
      setBusy(false)
    }
  }

  function playInsideSpotXFallback(track: SpotifyTrack) {
    // Without Premium, we can't play full tracks inside the browser via Spotify SDK.
    // So the “Play” button opens Spotify for full playback.
    openSpotifyTrack(track.id)
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Search</h2>
            <p className="mt-2 text-sm text-plum/85">
              Search results. Like/unlike and add to playlists are enabled. Playback opens the track in Spotify.
            </p>
          </div>

          {!token ? (
            <button
              type="button"
              onClick={() => startSpotifyLogin()}
              className="rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-plum/90"
            >
              Sign in to Spotify
            </button>
          ) : null}
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <input
            type="search"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search songs, artists…"
            className="min-w-0 flex-1 rounded-full border border-sand bg-white px-4 py-2.5 text-sm text-ink shadow-soft outline-none ring-plum/30 focus:ring-2"
            disabled={busy || !token}
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={busy || !token || !searchQ.trim()}
            className="rounded-full bg-coral px-6 py-2.5 text-sm font-bold text-white shadow-lift transition enabled:hover:opacity-95 disabled:opacity-40"
          >
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearchQ('')
              setResults([])
              setLiked({})
              setStatus(null)
            }}
            disabled={busy}
            className="rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-plum shadow-soft transition hover:bg-mist disabled:opacity-40"
          >
            Clear
          </button>
        </div>

        {resultsInfo ? <p className="mt-3 text-xs text-plum/70">{resultsInfo}</p> : null}
        {status ? <p className="mt-3 text-sm text-plum/85">{status}</p> : null}
      </section>

      <section>
        <ul className="space-y-2">
          {results.length === 0 && searchQ.trim() && !busy && <li className="text-sm text-plum/70">No results.</li>}

          {results.map((t) => {
            const isLiked = liked[t.id] === true
            const image = t.album.images?.[0]?.url
            const artists = t.artists.map((a) => a.name).join(', ')
            return (
              <li
                key={t.id}
                className="flex flex-col gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {image ? <img src={image} alt="" className="h-10 w-10 rounded-2xl object-cover shadow-soft" /> : <div className="h-10 w-10 rounded-2xl bg-mist" />}
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{t.name}</p>
                    <p className="truncate text-sm text-plum/70">{artists}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void toggleLike(t.id)}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      isLiked ? 'bg-white ring-1 ring-sand/60 text-plum hover:bg-mist' : 'bg-white/70 ring-1 ring-sand/60 text-plum hover:bg-mist'
                    }`}
                  >
                    {isLiked ? 'Unlike' : 'Like'}
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setPlaylistPickFor(t.id)
                      setPickedPlaylistId('')
                      void ensurePlaylistsLoaded()
                    }}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-plum ring-1 ring-sand/60 hover:bg-mist"
                  >
                    Add to playlist
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => playInsideSpotXFallback(t)}
                    className="rounded-xl bg-plum px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum/90"
                  >
                    Play
                  </button>
                </div>

                {playlistPickFor === t.id ? (
                  <div className="w-full pt-1 sm:pt-0 sm:w-auto">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <select
                        value={pickedPlaylistId}
                        onChange={(e) => setPickedPlaylistId(e.target.value)}
                        className="w-full rounded-xl border border-sand bg-white px-3 py-2 text-sm text-ink shadow-soft outline-none"
                      >
                        <option value="">Select playlist…</option>
                        {playlists.map((pl) => (
                          <option key={pl.id} value={pl.id}>
                            {pl.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy || !pickedPlaylistId}
                        onClick={() => void addToPlaylist(t, pickedPlaylistId)}
                        className="rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white shadow-lift transition disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}




import { useEffect, useState } from 'react'
import { openSpotifyPlaylist, spotifyGetMyPlaylists, type SpotifyPlaylist } from '../spotify/spotifyApi'
import { startSpotifyLogin } from '../spotify/spotifyAuth'
import { useSpotifyToken } from '../spotify/useSpotifyToken'

export default function Playlists() {
  const { token } = useSpotifyToken()

  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([])
  const [spotifyStatus, setSpotifyStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    setSpotifyStatus(null)
    spotifyGetMyPlaylists({ token })
      .then((pls) => setSpotifyPlaylists(pls))
      .catch((e) => setSpotifyStatus(e instanceof Error ? e.message : 'Failed to load Spotify playlists'))
  }, [token])

  return (
    <div className="space-y-10 pb-10">
      <section className="rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft sm:p-8">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Playlists</h2>
            <p className="mt-2 text-sm text-plum/85">Your Spotify playlists.</p>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-ink">Your Spotify playlists</h3>
          {token ? <p className="text-xs text-plum/70">{spotifyPlaylists.length} item(s)</p> : null}
        </div>

        {!token ? (
          <div className="rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft sm:p-8">
            <p className="text-sm text-plum/85">Sign in from Search to load your Spotify playlists.</p>
            <button
              type="button"
              onClick={() => startSpotifyLogin()}
              className="mt-4 rounded-full bg-plum px-5 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-plum/90"
            >
              Sign in to Spotify
            </button>
          </div>
        ) : spotifyPlaylists.length === 0 ? (
          <p className="text-sm text-plum/70">{spotifyStatus ?? 'No playlists loaded.'}</p>
        ) : (
          <ul className="space-y-2">
            {spotifyPlaylists.slice(0, 10).map((pl) => (
              <li key={pl.id} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{pl.name}</p>
                  <p className="truncate text-sm text-plum/70">{pl.id}</p>
                </div>
                <button
                  type="button"
                  className="rounded-xl bg-plum px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum/90"
                  onClick={() => openSpotifyPlaylist(pl.id)}
                >
                  Open
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}



import { useEffect, useState } from 'react'
import { usePlayer } from '../player/PlayerContext'
import { playlists, tracksToRefs } from '../mock/catalog'
import { createUserPlaylist, getLikedTrackIds, getUserPlaylists, removeUserPlaylist } from '../store/localStore'
import { openSpotifyPlaylist, spotifyGetMyPlaylists, type SpotifyPlaylist } from '../spotify/spotifyApi'
import { startSpotifyLogin } from '../spotify/spotifyAuth'
import { useSpotifyToken } from '../spotify/useSpotifyToken'

export default function Playlists() {
  const { actions } = usePlayer()
  const { token } = useSpotifyToken()

  const [userPlaylists, setUserPlaylists] = useState(() => getUserPlaylists())

  const [spotifyPlaylists, setSpotifyPlaylists] = useState<SpotifyPlaylist[]>([])
  const [spotifyStatus, setSpotifyStatus] = useState<string | null>(null)

  useEffect(() => {
    setUserPlaylists(getUserPlaylists())
  }, [])

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
            <p className="mt-2 text-sm text-plum/85">Your playlists (browser-saved) and mock discovery playlists.</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-coral px-5 py-2.5 text-sm font-bold text-white shadow-lift transition hover:opacity-95"
            onClick={() => {
              const name = window.prompt('Playlist name?')
              if (!name) return
              const trackIds = getLikedTrackIds().slice(0, 6)
              createUserPlaylist(name, trackIds)
              setUserPlaylists(getUserPlaylists())
            }}
          >
            New playlist
          </button>
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

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-ink">Your playlists</h3>
          <p className="text-xs text-plum/70">{userPlaylists.length} item(s)</p>
        </div>

        {userPlaylists.length === 0 ? (
          <p className="text-sm text-plum/70">Create a playlist to see it here.</p>
        ) : (
          <ul className="space-y-2">
            {userPlaylists.map((pl) => (
              <li key={pl.id} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{pl.name}</p>
                  <p className="truncate text-sm text-plum/70">{pl.trackIds.length} tracks</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-xl bg-plum px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum/90"
                    onClick={() => actions.playQueue(tracksToRefs(pl.trackIds), 0)}
                  >
                    Play
                  </button>
                  <button
                    type="button"
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-plum ring-1 ring-sand/60 hover:bg-mist"
                    onClick={() => {
                      removeUserPlaylist(pl.id)
                      setUserPlaylists(getUserPlaylists())
                    }}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-ink">Discover</h3>
          <p className="text-xs text-plum/70">Mock playlists</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {playlists.map((pl) => (
            <article
              key={pl.id}
              className="group overflow-hidden rounded-3xl border border-sand bg-white/60 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <button type="button" className="relative w-full text-left" onClick={() => actions.playQueue(tracksToRefs(pl.trackIds), 0)}>
                <img
                  src={pl.coverUrl}
                  alt=""
                  className="aspect-[4/3] w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-coral text-white shadow-lift opacity-0 transition group-hover:opacity-100">
                  ▶
                </span>
              </button>
              <div className="flex flex-col p-5">
                <h4 className="font-display text-lg font-semibold text-ink">{pl.name}</h4>
                <p className="mt-1 line-clamp-2 text-sm text-plum/80">{pl.description}</p>
                <p className="mt-4 text-xs font-medium uppercase tracking-wider text-sand">{pl.trackIds.length} tracks</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}



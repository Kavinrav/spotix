import { useEffect, useMemo, useState } from 'react'
import { usePlayer } from '../player/PlayerContext'
import { apiBase } from '../lib/api'
import { tracksToRefs } from '../mock/catalog'
import { getAllContinueProgress, getLikedTrackIds, toggleLiked } from '../store/localStore'
import type { TrackRef } from '../types'
import { useSpotifyToken } from '../spotify/useSpotifyToken'
import { openSpotifyTrack, spotifyGetLikedTracks, spotifyUnlikeTracks, type SpotifyTrack } from '../spotify/spotifyApi'
import { startSpotifyLogin } from '../spotify/spotifyAuth'

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

type Job = { id: string; title: string; ready: boolean }

export default function Library() {
  const { actions } = usePlayer()

  const [likedIds, setLikedIds] = useState(() => getLikedTrackIds())
  const [jobsMap, setJobsMap] = useState<Record<string, string>>({})
  const { token } = useSpotifyToken()
  const [spotifyLikedTracks, setSpotifyLikedTracks] = useState<SpotifyTrack[]>([])
  const [spotifyLikedStatus, setSpotifyLikedStatus] = useState<string | null>(null)

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const jobs = (await fetch(`${apiBase()}/api/jobs`).then((r) => r.json())) as Job[]
        const map: Record<string, string> = {}
        jobs.forEach((j) => {
          map[j.id] = j.title
        })
        setJobsMap(map)
      } catch {
        // best-effort
      }
    }
    void loadJobs()
  }, [])

  useEffect(() => {
    if (!token) return
    const run = async () => {
      setSpotifyLikedStatus(null)
      try {
        const items = await spotifyGetLikedTracks({ token, limit: 20 })
        setSpotifyLikedTracks(items)
      } catch (e) {
        setSpotifyLikedStatus(e instanceof Error ? e.message : 'Failed to load Spotify liked tracks')
      }
    }
    void run()
  }, [token])

  const likedTracks: TrackRef[] = useMemo(() => {
    return likedIds
      .map((id) => tracksToRefs([id])[0])
      .filter((t): t is TrackRef => Boolean(t))
  }, [likedIds])

  const continueItems = useMemo(() => {
    const all = getAllContinueProgress()
    const entries = Object.entries(all)
      .map(([key, progress]) => ({ key, progress, updatedAt: progress.updatedAt }))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10)

    return entries.map(({ key, progress }) => {
      const [kind, id] = key.split(':', 2)
      if (kind === 'mock') {
        const track = tracksToRefs([id])[0]
        return track
          ? {
              track,
              progress,
            }
          : null
      }

      if (kind === 'job') {
        const track: TrackRef = {
          kind: 'job',
          id,
          title: jobsMap[id] ?? id,
          artist: 'Audiobook import',
        }
        return { track, progress }
      }

      return null
    })
      .filter((x): x is { track: TrackRef; progress: { positionSec: number; durationSec?: number; updatedAt: number } } => Boolean(x))
  }, [jobsMap])

  return (
    <div className="space-y-10 pb-10">
      <section className="rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft sm:p-8">
        <h2 className="font-display text-xl font-semibold text-ink">Library</h2>
        <p className="mt-2 text-sm text-plum/85">Liked tracks and “continue listening”. (Stored in your browser.)</p>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-ink">Liked tracks</h3>
          <p className="text-xs text-plum/70">
            {token ? `${spotifyLikedTracks.length} item(s) from Spotify` : `${likedTracks.length} item(s) in SpotX mock`}
          </p>
        </div>

        {token ? (
          spotifyLikedTracks.length === 0 ? (
            <div className="space-y-3">
              {spotifyLikedStatus ? (
                <>
                  <p className="text-sm text-plum/70 text-red-600 font-medium">Error: {spotifyLikedStatus}</p>
                  <button
                    type="button"
                    onClick={() => startSpotifyLogin()}
                    className="mt-2 rounded-full bg-plum px-5 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-plum/90"
                  >
                    Re-authenticate with Spotify
                  </button>
                </>
              ) : null}
              <p className="text-sm text-plum/70">No liked tracks loaded from your Spotify account yet.</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {spotifyLikedTracks.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">{t.name}</p>
                    <p className="truncate text-sm text-plum/70">{t.artists.map((a) => a.name).join(', ')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="rounded-xl bg-plum px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum/90"
                      onClick={() => openSpotifyTrack(t.id)}
                    >
                      Play
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-plum ring-1 ring-sand/60 hover:bg-mist"
                      onClick={() => {
                        void (async () => {
                          if (!token) return
                          try {
                            await spotifyUnlikeTracks({ token, trackIds: [t.id] })
                            setSpotifyLikedTracks((prev) => prev.filter((x) => x.id !== t.id))
                          } catch (e) {
                            setSpotifyLikedStatus(e instanceof Error ? e.message : 'Unlike failed')
                          }
                        })()
                      }}
                    >
                      Unlike
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-plum/70">{likedTracks.length === 0 ? 'Like a track from Spotify Search to see it here.' : ''}</p>
              <button
                type="button"
                onClick={() => startSpotifyLogin()}
                className="rounded-full bg-plum px-5 py-2 text-sm font-bold text-white shadow-soft transition hover:bg-plum/90"
              >
                Sign in to Spotify
              </button>
            </div>
            {likedTracks.length === 0 ? null : (
              <ul className="space-y-2">
                {likedTracks.map((t) => (
                  <li
                    key={t.kind + ':' + t.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink">{t.title}</p>
                      <p className="truncate text-sm text-plum/70">{t.artist}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        className="rounded-xl bg-plum px-4 py-2 text-sm font-semibold text-white transition hover:bg-plum/90"
                        onClick={() => actions.playSingle(t)}
                      >
                        Play
                      </button>
                      <button
                        type="button"
                        className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-plum ring-1 ring-sand/60 hover:bg-mist"
                        onClick={() => {
                          toggleLiked(t.id)
                          setLikedIds(getLikedTrackIds())
                        }}
                      >
                        Unlike
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h3 className="font-display text-xl font-semibold text-ink">Continue listening</h3>
          <p className="text-xs text-plum/70">{continueItems.length} item(s)</p>
        </div>

        {continueItems.length === 0 ? (
          <p className="text-sm text-plum/70">Play something to populate this list.</p>
        ) : (
          <ul className="space-y-2">
            {continueItems.map(({ track, progress }) => (
              <li key={track.kind + ':' + track.id} className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{track.title}</p>
                  <p className="truncate text-sm text-plum/70">Resume at {formatTime(progress.positionSec)}</p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-xl bg-coral px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                  onClick={() => actions.playSingle(track, progress.positionSec)}
                >
                  Resume
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}



import { useMemo } from 'react'
import { usePlayer } from '../player/PlayerContext'
import { getPlaylist, featuredPlaylistIds, tracksToRefs } from '../mock/catalog'

export default function Home() {
  const { actions } = usePlayer()

  const featured = useMemo(() => featuredPlaylistIds.map((id) => getPlaylist(id)).filter((p): p is NonNullable<typeof p> => Boolean(p)), [])

  return (
    <div className="space-y-10 pb-10">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-plum via-plum to-coral p-8 text-white shadow-lift sm:p-12">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-16 left-1/3 h-48 w-48 rounded-full bg-coral/30 blur-3xl" />
        <div className="relative max-w-xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-white/70">SpotX picks</p>
          <h2 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">Curated listening, without the noise</h2>
          <p className="mt-4 text-base text-white/85">Browse mock playlists and enqueue them in the shared player.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => {
                const pl = featured[0]
                if (!pl) return
                actions.playQueue(tracksToRefs(pl.trackIds), 0)
              }}
              className="rounded-full bg-white px-6 py-3 text-sm font-bold text-plum shadow-soft transition hover:bg-mist"
            >
              Play featured
            </button>
            <button type="button" className="rounded-full border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold backdrop-blur transition hover:bg-white/20">
              Save to library
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <h3 className="font-display text-2xl font-semibold text-ink">Featured playlists</h3>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((pl) => (
            <article
              key={pl.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-sand bg-white/60 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift"
            >
              <button
                type="button"
                className="relative aspect-[4/3] w-full overflow-hidden text-left"
                onClick={() => actions.playQueue(tracksToRefs(pl.trackIds), 0)}
              >
                <img src={pl.coverUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                <span className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-coral text-white shadow-lift opacity-0 transition group-hover:opacity-100">
                  ▶
                </span>
              </button>
              <div className="flex flex-1 flex-col p-5">
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


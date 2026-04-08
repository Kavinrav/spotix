import type { ReactNode } from 'react'

export type RouteKey = 'home' | 'search' | 'library' | 'playlists' | 'audiobooks'

type NavItem = {
  key: RouteKey
  label: string
}

const items: NavItem[] = [
  { key: 'home', label: 'Home' },
  { key: 'search', label: 'Search' },
  { key: 'library', label: 'Library' },
  { key: 'playlists', label: 'Playlists' },
  { key: 'audiobooks', label: 'Audiobooks' },
]

export default function Sidebar({
  route,
  onRoute,
  footer,
}: {
  route: RouteKey
  onRoute: (r: RouteKey) => void
  footer?: ReactNode
}) {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sand/60 bg-paper/70 backdrop-blur-md sm:flex">
      <div className="px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br from-plum to-coral shadow-soft">
            <span className="font-display text-lg font-bold text-white">X</span>
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold text-ink">SpotX</p>
            <p className="truncate text-xs font-medium text-plum/70">Music + Audiobooks</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <div className="space-y-2">
          {items.map((it) => (
            <button
              key={it.key}
              type="button"
              onClick={() => onRoute(it.key)}
              className={`w-full rounded-2xl px-3 py-2 text-left text-sm font-semibold transition ${
                route === it.key ? 'bg-ink text-paper shadow-soft' : 'bg-transparent text-plum hover:bg-mist/80'
              }`}
            >
              {it.label}
            </button>
          ))}
        </div>
      </nav>

      {footer ? <div className="px-3 pb-4">{footer}</div> : <div className="px-3 pb-4 text-xs text-plum/60">Mock account</div>}
    </aside>
  )
}


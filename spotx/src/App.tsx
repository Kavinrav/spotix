import { useState } from 'react'
import Sidebar, { type RouteKey } from './components/Sidebar'
import Player from './components/Player'
import { PlayerProvider } from './player/PlayerContext'
import Library from './pages/Library'
import Playlists from './pages/Playlists'
import Audiobooks from './pages/Audiobooks'
import SpotifyCallback from './pages/SpotifyCallback'

export default function App() {
  if (window.location.pathname === '/callback') {
    return <SpotifyCallback />
  }

  const [route, setRoute] = useState<RouteKey>('library')

  const Page = (() => {
    switch (route) {
      case 'library':
        return <Library />
      case 'playlists':
        return <Playlists />
      case 'audiobooks':
        return <Audiobooks />
      default:
        return <Library />
    }
  })()

  return (
    <PlayerProvider>
      <div className="grain min-h-screen bg-paper">
        <header className="sticky top-0 z-40 border-b border-sand/60 bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-plum to-coral shadow-lift">
                <span className="font-display text-lg font-bold text-white">X</span>
              </div>
              <div>
                <h1 className="font-display text-xl font-semibold text-ink">SpotX</h1>
                <p className="text-xs font-medium text-plum/80">Spotify-like UI · video to audiobook</p>
              </div>
            </div>
          </div>

          <div className="mx-auto flex max-w-6xl gap-2 px-4 pb-4 sm:hidden">
            {(['library', 'playlists', 'audiobooks'] as RouteKey[]).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setRoute(k)}
                className={`rounded-full px-3 py-2 text-xs font-semibold transition ${
                  route === k ? 'bg-ink text-paper shadow-soft' : 'bg-white/70 text-plum hover:bg-mist'
                }`}
              >
                {k[0].toUpperCase() + k.slice(1)}
              </button>
            ))}
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl gap-0 px-4 pb-36 sm:px-6">
          <Sidebar route={route} onRoute={setRoute} />
          <main className="w-full py-10 sm:pl-8">{Page}</main>
        </div>

        <Player />
      </div>
    </PlayerProvider>
  )
}

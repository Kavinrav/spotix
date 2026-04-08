import { useEffect, useState } from 'react'
import { exchangeCodeForToken, spotifyConstants } from '../spotify/spotifyApi'

export default function SpotifyCallback() {
  const [status, setStatus] = useState('Authorizing...')

  useEffect(() => {
    const run = async () => {
      try {
        const sp = new URLSearchParams(window.location.search)
        const code = sp.get('code')
        const state = sp.get('state')
        const storedState = sessionStorage.getItem('spotx.spotify.state')
        const verifier = sessionStorage.getItem('spotx.spotify.verifier')

        const errorMsg = sp.get('error')
        if (errorMsg) {
          setStatus(`Spotify authorization error: ${errorMsg}`)
          return
        }

        if (!code) {
          setStatus('Missing code from Spotify redirect.')
          return
        }
        if (!state) {
          setStatus('Missing state from Spotify redirect.')
          return
        }
        if (!verifier || !storedState) {
          setStatus('Missing local session data. Did you start the login on localhost but redirect to 127.0.0.1? Make sure the domains match!')
          return
        }
        if (storedState !== state) {
          setStatus('OAuth state mismatch. Please try again.')
          return
        }

        setStatus('Finishing sign-in...')
        const token = await exchangeCodeForToken({ code, codeVerifier: verifier })
        const now = Date.now()
        const exp = now + token.expires_in * 1000 - 15_000

        localStorage.setItem('spotx.spotify.accessToken', token.access_token)
        localStorage.setItem('spotx.spotify.expiresAt', String(exp))

        // Clean up to avoid replay
        sessionStorage.removeItem('spotx.spotify.verifier')
        sessionStorage.removeItem('spotx.spotify.state')

        // Replace URL to remove query params.
        window.history.replaceState({}, '', '/')
        setStatus('Signed in. You can close this tab.')
        // Reload so Search page can pick up token.
        window.location.reload()
      } catch (e) {
        setStatus(e instanceof Error ? e.message : 'Sign-in failed.')
      }
    }
    void run()
  }, [])

  return (
    <div className="min-h-screen bg-paper p-6">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft">
        <h1 className="font-display text-xl font-semibold text-ink">Spotify sign-in</h1>
        <p className="mt-3 text-sm text-plum/85">{status}</p>
        <p className="mt-6 text-xs text-plum/60">
          Redirect URI: <span className="font-mono">{spotifyConstants.redirectUri}</span>
        </p>
      </div>
    </div>
  )
}


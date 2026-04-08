import { useEffect, useMemo, useRef, useState } from 'react'
import { usePlayer } from '../player/PlayerContext'
import { resolveAudioUrl } from '../player/audioSources'
import { setContinueProgress } from '../store/localStore'

function formatTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function Player() {
  const {
    state,
    actions: { pause, resume, next, prev, setShuffle, setRepeatMode, setVolume, setProgress, setDuration, seek, onEnded },
    currentTrack,
  } = usePlayer()

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const lastSavedAtRef = useRef<number>(0)
  const lastTrackKeyRef = useRef<string | null>(null)
  const [playbackError, setPlaybackError] = useState<string | null>(null)
  const pendingSeekTimeRef = useRef<number | null>(null)

  const audioSrc = useMemo(() => {
    if (!currentTrack) return ''
    return resolveAudioUrl(currentTrack)
  }, [currentTrack])

  // Media Session (OS lock screen / media keys where supported).
  useEffect(() => {
    if (!currentTrack) return
    if (!('mediaSession' in navigator)) return
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ms = (navigator as any).mediaSession as MediaSession | undefined
    if (!ms) return

    ms.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.artist ?? (currentTrack.kind === 'job' ? 'Audiobook import' : 'SpotX'),
      album: currentTrack.kind === 'job' ? 'Audiobook' : 'Catalog',
    })

    ms.setActionHandler('play', () => resume())
    ms.setActionHandler('pause', () => pause())
    ms.setActionHandler('previoustrack', () => prev())
    ms.setActionHandler('nexttrack', () => next())

    ms.setActionHandler('seekto', (details: any) => {
      const a = audioRef.current
      if (!a || !details || typeof details.seekTime !== 'number') return
      a.currentTime = details.seekTime
      setProgress(details.seekTime)
    })
  }, [currentTrack, next, pause, prev, resume, setProgress])

  // Load / switch track when queue index changes.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return

    const trackKey = currentTrack ? `${currentTrack.kind}:${currentTrack.id}` : null
    const trackChanged = lastTrackKeyRef.current !== trackKey
    
    if (trackChanged) {
      lastTrackKeyRef.current = trackKey
      setPlaybackError(null)

      // Store the target seek time so we can apply it in onLoadedMetadata.
      const startAt = state.startAtSec
      pendingSeekTimeRef.current = startAt === null ? 0 : Math.max(0, startAt)
      if (pendingSeekTimeRef.current > 0) {
        console.log(`[Player] Track changed: Pending seek to ${pendingSeekTimeRef.current}s`)
      }

      // Explicitly load the new source.
      if (currentTrack) {
        console.log(`[Player] Loading track: ${currentTrack.title}`)
        a.load()
      }
    }

    if (!currentTrack) return

    if (state.isPlaying) {
      // Validate audio source before attempting to play
      if (!a.src || a.src === 'http://127.0.0.1:5173/' || a.src === '') {
        console.error('[Player] Cannot play: No valid audio source available')
        console.error('[Player] Current audioSrc:', audioSrc)
        console.error('[Player] Audio element src:', a.src)
        
        // Try to restore the source if we have a valid audioSrc
        if (audioSrc && audioSrc !== '') {
          console.log('[Player] Restoring audio source from audioSrc')
          a.src = audioSrc
          a.load()
          // Retry play after source restoration
          setTimeout(() => {
            a.play().catch((err: any) => {
              console.error(`[Player] play() failed after source restore: ${err.name} - ${err.message}`, err)
              if (err.name !== 'AbortError') {
                setPlaybackError('Autoplay blocked or playback failed.')
              }
            })
          }, 100)
          return
        }
        
        setPlaybackError('No audio source available')
        return
      }
      
      void a.play().catch((err: any) => {
        console.error(`[Player] play() failed: ${err.name} - ${err.message}`, err)
        if (err.name !== 'AbortError') {
          setPlaybackError('Autoplay blocked or playback failed.')
        }
      })
    } else {
      a.pause()
    }
  }, [audioSrc, currentTrack, state.isPlaying, state.startAtSec])

  // Continue listening persistence (throttled).
  useEffect(() => {
    if (!currentTrack) return
    if (!state.isPlaying) return

    const now = Date.now()
    if (now - lastSavedAtRef.current < 2500) return
    if (!Number.isFinite(state.progressSec)) return

    lastSavedAtRef.current = now
    setContinueProgress(currentTrack, {
      positionSec: state.progressSec,
      durationSec: state.durationSec || undefined,
      updatedAt: now,
    })
  }, [currentTrack, state.durationSec, state.isPlaying, state.progressSec])

  // Volume sync.
  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.volume = state.volume
  }, [state.volume])

  return (
    <>
      {audioSrc && audioSrc !== '' && (
        <audio
          ref={audioRef}
          src={audioSrc}
          preload="metadata"
          crossOrigin="anonymous"
          onTimeUpdate={() => {
            const a = audioRef.current
            if (!a) return
            setProgress(a.currentTime)
            
            // Time tracking handled by setProgress(a.currentTime)
          }}
          onWaiting={() => {
            console.log(`[Player] Waiting (buffering) at ${audioRef.current?.currentTime}s`)
          }}
          onPlaying={() => {
            console.log(`[Player] Playing started/resumed at ${audioRef.current?.currentTime}s`)
          }}
          onLoadedMetadata={() => {
            const a = audioRef.current
            if (!a) return
            console.log(`[Player] Metadata loaded: duration=${a.duration}s`)
            setDuration(a.duration || 0)
            
            // Apply deferred seek once metadata is loaded.
            if (pendingSeekTimeRef.current !== null) {
              console.log(`[Player] Applying deferred seek to ${pendingSeekTimeRef.current}s`)
              a.currentTime = pendingSeekTimeRef.current
              pendingSeekTimeRef.current = null
            }
          }}
          onError={(e) => {
            const a = e.currentTarget
            const error = a.error
            let msg = 'Unknown error'
            if (error) {
              switch (error.code) {
                case 1: msg = 'Aborted: Loading was interrupted.'; break
                case 2: msg = 'Network: A connection error occurred.'; break
                case 3: msg = 'Decode: The audio is corrupted or not supported.'; break
                case 4: msg = 'Not Supported: Source format/URL not supported.'; break
              }
              console.error(`[Player] Error ${error.code} at ${a.currentTime}s: ${error.message}`)
              console.error('[Player] Current Source:', a.src)
              
              // Handle empty/invalid source
              if (!a.src || a.src === 'http://127.0.0.1:5173/' || a.src === '') {
                console.log('[Player] Empty or invalid source detected, skipping retry')
                setPlaybackError('Invalid audio source')
                return
              }
              
              // Immediate auto-seek for streaming errors with improved fallback
              if (error.code === 2 || error.code === 3) {
                const currentTime = a.currentTime
                console.log(`[Player] Streaming error at ${currentTime.toFixed(1)}s, attempting auto-seek`)
                
                // Try multiple seek strategies
                const seekAttempts = [
                  { jump: 60, description: '60s forward' },
                  { jump: 120, description: '120s forward' },
                  { jump: 300, description: '5 minutes forward' },
                  { jump: 600, description: '10 minutes forward' }
                ]
                
                let attemptIndex = 0
                
                const trySeek = () => {
                  if (attemptIndex >= seekAttempts.length) {
                    console.log('[Player] All seek attempts failed, reloading from beginning')
                    a.currentTime = 0
                    a.load()
                    a.play().catch(() => {
                      setPlaybackError('Unable to recover from streaming error')
                    })
                    return
                  }
                  
                  const attempt = seekAttempts[attemptIndex]
                  const newTime = currentTime + attempt.jump
                  const targetTime = Math.min(newTime, a.duration || newTime)
                  
                  console.log(`[Player] Attempt ${attemptIndex + 1}: Seeking ${attempt.description} to ${targetTime.toFixed(1)}s`)
                  a.currentTime = targetTime
                  
                  // Try to continue playing after seek
                  setTimeout(() => {
                    a.play().catch(() => {
                      console.log(`[Player] Seek attempt ${attemptIndex + 1} failed, trying next strategy`)
                      attemptIndex++
                      trySeek()
                    })
                  }, 1000)
                }
                
                trySeek()
                return
              }
            }
            setPlaybackError(msg)
          }}
          onEnded={() => onEnded()}
        />
      )}

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-sand/80 bg-paper/95 backdrop-blur-lg">
          {playbackError && (
            <div className="bg-red-500/10 px-4 py-1 text-center text-[10px] font-bold text-red-600">
              {playbackError}
            </div>
          )}
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink">{currentTrack.title}</p>
              <p className="truncate text-xs text-plum/70">{currentTrack.artist ?? (currentTrack.kind === 'job' ? 'Audiobook import' : 'SpotX')}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-1 sm:items-center">
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  aria-label="Shuffle"
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    state.shuffle ? 'bg-plum text-white' : 'bg-white/70 text-plum hover:bg-mist'
                  }`}
                  onClick={() => setShuffle(!state.shuffle)}
                >
                  Shuffle
                </button>
                <button
                  type="button"
                  aria-label="Previous"
                  className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-plum hover:bg-mist transition"
                  onClick={() => prev()}
                >
                  Prev
                </button>
                <button
                  type="button"
                  aria-label="Play/Pause"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl bg-coral text-white shadow-soft transition hover:opacity-95"
                  onClick={() => {
                    if (state.isPlaying) pause()
                    else resume()
                  }}
                >
                  {state.isPlaying ? 'II' : '▶'}
                </button>
                <button
                  type="button"
                  aria-label="Next"
                  className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-plum hover:bg-mist transition"
                  onClick={() => next()}
                >
                  Next
                </button>
                <button
                  type="button"
                  aria-label="Repeat"
                  className="rounded-xl bg-white/70 px-3 py-2 text-sm font-semibold text-plum hover:bg-mist transition"
                  onClick={() => {
                    const nextMode = state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off'
                    setRepeatMode(nextMode)
                  }}
                >
                  Repeat: {state.repeatMode}
                </button>
              </div>

              <div className="w-full max-w-xl">
                <div className="flex items-center gap-3 text-xs text-plum/60">
                  <span className="shrink-0">{formatTime(state.progressSec)}</span>
                  <input
                    aria-label="Seek"
                    type="range"
                    min={0}
                    max={Math.max(0, state.durationSec || 0)}
                    step={0.1}
                    value={state.progressSec}
                    className="w-full accent-plum"
                    onChange={(e) => {
                      const v = Number(e.target.value)
                      seek(v)
                      const a = audioRef.current
                      if (!a || !Number.isFinite(v)) return
                      a.currentTime = v
                    }}
                  />
                  <span className="shrink-0">{formatTime(state.durationSec)}</span>
                </div>

                <div className="mt-2 flex items-center gap-3 text-xs text-plum/60">
                  <span className="shrink-0">Vol</span>
                  <input
                    aria-label="Volume"
                    type="range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={state.volume}
                    className="w-full accent-plum"
                    onChange={(e) => setVolume(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}


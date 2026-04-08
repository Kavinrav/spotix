import { createContext, useContext, useMemo, useReducer } from 'react'
import type { PlayerState, PlayerAction, PlayerContextValue } from './playerTypes'
import type { RepeatMode } from '../types'

const PlayerContext = createContext<PlayerContextValue | null>(null)

const initialState: PlayerState = {
  queue: [],
  currentIndex: null,
  isPlaying: false,
  shuffle: false,
  repeatMode: 'off',
  volume: 0.9,
  progressSec: 0,
  durationSec: 0,
  startAtSec: null,
}

function nextIndex(state: PlayerState, currentIndex: number): number | null {
  if (state.queue.length === 0) return null

  const lastIndex = state.queue.length - 1

  if (state.repeatMode === 'one') return currentIndex

  if (!state.shuffle) {
    const idx = currentIndex + 1
    if (idx <= lastIndex) return idx
    if (state.repeatMode === 'all') return 0
    return null
  }

  // Shuffle: pick a different index when possible.
  if (state.queue.length === 1) return currentIndex
  const candidates = Array.from({ length: state.queue.length }, (_, i) => i).filter((i) => i !== currentIndex)
  const pick = candidates[Math.floor(Math.random() * candidates.length)]
  return pick
}

function prevIndex(state: PlayerState, currentIndex: number): number | null {
  if (state.queue.length === 0) return null
  if (state.repeatMode === 'one') return currentIndex

  const firstIndex = 0
  if (!state.shuffle) {
    const idx = currentIndex - 1
    if (idx >= firstIndex) return idx
    if (state.repeatMode === 'all') return state.queue.length - 1
    return null
  }

  // Shuffle prev: choose random index (excluding current).
  if (state.queue.length === 1) return currentIndex
  const candidates = Array.from({ length: state.queue.length }, (_, i) => i).filter((i) => i !== currentIndex)
  return candidates[Math.floor(Math.random() * candidates.length)]
}

function reducer(state: PlayerState, action: PlayerAction): PlayerState {
  switch (action.type) {
    case 'PLAY_QUEUE': {
      return {
        ...state,
        queue: action.tracks,
        currentIndex: action.startIndex,
        isPlaying: true,
        progressSec: 0,
        durationSec: 0,
        startAtSec: action.startAtSec ?? null,
      }
    }
    case 'PLAY_SINGLE': {
      return {
        ...state,
        queue: [action.track],
        currentIndex: 0,
        isPlaying: true,
        progressSec: 0,
        durationSec: 0,
        startAtSec: action.startAtSec ?? null,
      }
    }
    case 'PAUSE':
      return { ...state, isPlaying: false }
    case 'RESUME':
      return { ...state, isPlaying: true }
    case 'SET_SHUFFLE':
      return { ...state, shuffle: action.value }
    case 'SET_REPEAT':
      return { ...state, repeatMode: action.value as RepeatMode }
    case 'SET_VOLUME':
      return { ...state, volume: Math.min(1, Math.max(0, action.value)) }
    case 'SET_PROGRESS':
      return { ...state, progressSec: action.value }
    case 'SET_DURATION':
      return { ...state, durationSec: action.value }
    case 'SEEK': {
      // Progress is driven by the audio element's time updates, but we keep the desired value
      // so the UI can update immediately.
      return { ...state, progressSec: action.value }
    }
    case 'NEXT': {
      if (state.currentIndex === null) return state
      const idx = nextIndex(state, state.currentIndex)
      if (idx === null) return { ...state, isPlaying: false, startAtSec: null, durationSec: 0 }
      return { ...state, currentIndex: idx, isPlaying: true, progressSec: 0, durationSec: 0, startAtSec: null }
    }
    case 'PREV': {
      if (state.currentIndex === null) return state
      const idx = prevIndex(state, state.currentIndex)
      if (idx === null) return { ...state, progressSec: 0, durationSec: 0, startAtSec: null }
      return { ...state, currentIndex: idx, isPlaying: true, progressSec: 0, durationSec: 0, startAtSec: null }
    }
    case 'ON_ENDED': {
      // If queue is empty, do nothing.
      if (state.currentIndex === null) return state
      const idx = nextIndex(state, state.currentIndex)
      if (idx === null) return { ...state, isPlaying: false, startAtSec: null, durationSec: 0 }
      return { ...state, currentIndex: idx, isPlaying: true, progressSec: 0, durationSec: 0, startAtSec: null }
    }
    default:
      return state
  }
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const currentTrack = state.currentIndex === null ? null : state.queue[state.currentIndex] ?? null

  const value: PlayerContextValue = useMemo(
    () => ({
      state,
      currentTrack,
      actions: {
        playQueue: (tracks, startIndex = 0, startAtSec) => dispatch({ type: 'PLAY_QUEUE', tracks, startIndex, startAtSec }),
        playSingle: (track, startAtSec) => dispatch({ type: 'PLAY_SINGLE', track, startAtSec }),
        pause: () => dispatch({ type: 'PAUSE' }),
        resume: () => dispatch({ type: 'RESUME' }),
        next: () => dispatch({ type: 'NEXT' }),
        prev: () => dispatch({ type: 'PREV' }),
        setShuffle: (value) => dispatch({ type: 'SET_SHUFFLE', value }),
        setRepeatMode: (value) => dispatch({ type: 'SET_REPEAT', value }),
        setVolume: (value) => dispatch({ type: 'SET_VOLUME', value }),
        setProgress: (value) => dispatch({ type: 'SET_PROGRESS', value }),
        setDuration: (value) => dispatch({ type: 'SET_DURATION', value }),
        seek: (value) => dispatch({ type: 'SEEK', value }),
        onEnded: () => dispatch({ type: 'ON_ENDED' }),
      },
    }),
    [state],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext)
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider')
  return ctx
}


import type { RepeatMode, TrackRef } from '../types'

export type PlayerState = {
  queue: TrackRef[]
  currentIndex: number | null
  isPlaying: boolean
  shuffle: boolean
  repeatMode: RepeatMode
  volume: number
  progressSec: number
  durationSec: number
  startAtSec: number | null
}

export type PlayerAction =
  | { type: 'PLAY_QUEUE'; tracks: TrackRef[]; startIndex: number; startAtSec?: number }
  | { type: 'PLAY_SINGLE'; track: TrackRef; startAtSec?: number }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'SET_SHUFFLE'; value: boolean }
  | { type: 'SET_REPEAT'; value: RepeatMode }
  | { type: 'SET_VOLUME'; value: number }
  | { type: 'SET_PROGRESS'; value: number }
  | { type: 'SET_DURATION'; value: number }
  | { type: 'SEEK'; value: number }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'ON_ENDED' }

export type PlayerContextValue = {
  state: PlayerState
  actions: {
    playQueue: (tracks: TrackRef[], startIndex?: number, startAtSec?: number) => void
    playSingle: (track: TrackRef, startAtSec?: number) => void
    pause: () => void
    resume: () => void
    next: () => void
    prev: () => void
    setShuffle: (value: boolean) => void
    setRepeatMode: (value: RepeatMode) => void
    setVolume: (value: number) => void
    setProgress: (value: number) => void
    setDuration: (value: number) => void
    seek: (value: number) => void
    onEnded: () => void
  }
  currentTrack: TrackRef | null
}


export type TrackKind = 'mock' | 'job'

export type RepeatMode = 'off' | 'all' | 'one'

export type TrackRef = {
  kind: TrackKind
  id: string
  title: string
  artist?: string
  artworkUrl?: string
  /**
   * For mock tracks only. For job tracks, the backend audio URL is derived from `id`.
   */
  audioUrl?: string
}


import type { TrackRef } from '../types'

export function resolveAudioUrl(track: TrackRef): string {
  if (track.kind === 'job') {
    const url = `/api/audio/${track.id}`
    console.log(
      '%c [STREAM] %c Proxy Audio URL: ' + url,
      'background: #1DB954; color: white; font-weight: bold; padding: 2px 4px; border-radius: 4px;',
      'color: #1DB954; font-weight: bold;'
    )
    return url
  }
  return track.audioUrl ?? ''
}


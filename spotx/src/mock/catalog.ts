import type { TrackRef } from '../types'

export type CatalogTrack = {
  id: string
  title: string
  artist: string
  durationLabel: string
  artworkUrl: string
  audioUrl: string
}

export type CatalogPlaylist = {
  id: string
  name: string
  description: string
  coverUrl: string
  trackIds: string[]
}

const cover = (seed: string) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/320/320`

export const tracks: CatalogTrack[] = [
  {
    id: 'trk-amber-drift',
    title: 'Amber Drift',
    artist: 'Lumen Field',
    durationLabel: '3:24',
    artworkUrl: cover('amber-drift'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: 'trk-velvet-line',
    title: 'Velvet Line',
    artist: 'North Echo',
    durationLabel: '4:01',
    artworkUrl: cover('velvet-line'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: 'trk-paper-moon',
    title: 'Paper Moon',
    artist: 'Studio Kite',
    durationLabel: '2:58',
    artworkUrl: cover('paper-moon'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
  {
    id: 'trk-metro-pulse',
    title: 'Metro Pulse',
    artist: 'Line 7',
    durationLabel: '3:45',
    artworkUrl: cover('metro-pulse'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
  },
  {
    id: 'trk-glass-river',
    title: 'Glass River',
    artist: 'Yuki & Co',
    durationLabel: '5:12',
    artworkUrl: cover('glass-river'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
  },
  {
    id: 'trk-bloom-theory',
    title: 'Bloom Theory',
    artist: 'Quiet Maths',
    durationLabel: '6:30',
    artworkUrl: cover('bloom-theory'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
  },
  {
    id: 'trk-lattice',
    title: 'Lattice',
    artist: 'Gridtone',
    durationLabel: '4:22',
    artworkUrl: cover('lattice'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3',
  },
  {
    id: 'trk-coral-atlas',
    title: 'Coral Atlas',
    artist: 'Saffron Tide',
    durationLabel: '3:57',
    artworkUrl: cover('coral-atlas'),
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
  },
]

export const playlists: CatalogPlaylist[] = [
  {
    id: 'pl-morning-haze',
    name: 'Morning Haze',
    description: 'Soft beats to ease into the day',
    coverUrl: cover('morning-haze'),
    trackIds: ['trk-amber-drift', 'trk-velvet-line', 'trk-paper-moon'],
  },
  {
    id: 'pl-night-transit',
    name: 'Night Transit',
    description: 'Neon-tinted rhythms for late rides',
    coverUrl: cover('night-transit'),
    trackIds: ['trk-metro-pulse', 'trk-glass-river'],
  },
  {
    id: 'pl-focus-bloom',
    name: 'Focus Bloom',
    description: 'Instrumental focus without fatigue',
    coverUrl: cover('focus-bloom'),
    trackIds: ['trk-bloom-theory', 'trk-lattice'],
  },
  {
    id: 'pl-editorial-warmup',
    name: 'Editorial Warmup',
    description: 'A quick playlist for writing time',
    coverUrl: cover('editorial-warmup'),
    trackIds: ['trk-amber-drift', 'trk-coral-atlas', 'trk-lattice'],
  },
]

export const featuredPlaylistIds = ['pl-morning-haze', 'pl-focus-bloom', 'pl-night-transit']

const trackByIdMap = new Map(tracks.map((t) => [t.id, t] as const))
const playlistByIdMap = new Map(playlists.map((p) => [p.id, p] as const))

export function getTrack(trackId: string): CatalogTrack | undefined {
  return trackByIdMap.get(trackId)
}

export function getPlaylist(playlistId: string): CatalogPlaylist | undefined {
  return playlistByIdMap.get(playlistId)
}

export function tracksToRefs(trackIds: string[]): TrackRef[] {
  return trackIds
    .map((id) => getTrack(id))
    .filter((t): t is CatalogTrack => Boolean(t))
    .map((t) => ({
      kind: 'mock',
      id: t.id,
      title: t.title,
      artist: t.artist,
      artworkUrl: t.artworkUrl,
      audioUrl: t.audioUrl,
    }))
}

export function searchTracks(query: string): CatalogTrack[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return tracks.filter((t) => `${t.title} ${t.artist}`.toLowerCase().includes(q))
}


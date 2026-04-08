import type { TrackKind, TrackRef } from '../types'

export type UserPlaylist = {
  id: string
  name: string
  description?: string
  trackIds: string[]
  createdAt: number
}

export type ContinueProgress = {
  /**
   * Current playback position in seconds.
   */
  positionSec: number
  /**
   * The duration at the moment of saving (best-effort).
   */
  durationSec?: number
  updatedAt: number
}

const KEY_LIKED = 'spotx.likedTrackIds'
const KEY_USER_PLAYLISTS = 'spotx.userPlaylists'
const KEY_CONTINUE = 'spotx.continueProgressByKey'

function safeJsonParse<T>(value: string | null): T | null {
  if (!value) return null
  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

function trackKey(kind: TrackKind, id: string) {
  return `${kind}:${id}`
}

export function getLikedTrackIds(): string[] {
  const parsed = safeJsonParse<string[]>(localStorage.getItem(KEY_LIKED))
  return Array.isArray(parsed) ? parsed : []
}

export function setLikedTrackIds(ids: string[]) {
  localStorage.setItem(KEY_LIKED, JSON.stringify(ids))
}

export function toggleLiked(trackId: string): { liked: boolean; nextIds: string[] } {
  const current = getLikedTrackIds()
  const liked = current.includes(trackId)
  const nextIds = liked ? current.filter((x) => x !== trackId) : [...current, trackId]
  setLikedTrackIds(nextIds)
  return { liked: !liked, nextIds }
}

export function getUserPlaylists(): UserPlaylist[] {
  const parsed = safeJsonParse<UserPlaylist[]>(localStorage.getItem(KEY_USER_PLAYLISTS))
  return Array.isArray(parsed) ? parsed : []
}

export function setUserPlaylists(playlists: UserPlaylist[]) {
  localStorage.setItem(KEY_USER_PLAYLISTS, JSON.stringify(playlists))
}

export function createUserPlaylist(name: string, trackIds: string[], description?: string): UserPlaylist {
  const playlists = getUserPlaylists()
  const id = `upl-${Math.random().toString(16).slice(2)}-${Date.now()}`
  const pl: UserPlaylist = { id, name, description, trackIds, createdAt: Date.now() }
  setUserPlaylists([...playlists, pl])
  return pl
}

export function updateUserPlaylist(playlistId: string, patch: Partial<UserPlaylist>): void {
  const playlists = getUserPlaylists()
  const next = playlists.map((p) => (p.id === playlistId ? { ...p, ...patch } : p))
  setUserPlaylists(next)
}

export function removeUserPlaylist(playlistId: string): void {
  const playlists = getUserPlaylists().filter((p) => p.id !== playlistId)
  setUserPlaylists(playlists)
}

export function getContinueProgress(track: TrackRef): ContinueProgress | null {
  const parsed = safeJsonParse<Record<string, ContinueProgress>>(localStorage.getItem(KEY_CONTINUE))
  if (!parsed) return null
  return parsed[trackKey(track.kind, track.id)] ?? null
}

export function setContinueProgress(track: TrackRef, progress: ContinueProgress): void {
  const parsed = safeJsonParse<Record<string, ContinueProgress>>(localStorage.getItem(KEY_CONTINUE)) ?? {}
  parsed[trackKey(track.kind, track.id)] = progress
  localStorage.setItem(KEY_CONTINUE, JSON.stringify(parsed))
}

export function getAllContinueProgress(): Record<string, ContinueProgress> {
  const parsed = safeJsonParse<Record<string, ContinueProgress>>(localStorage.getItem(KEY_CONTINUE))
  return parsed ?? {}
}


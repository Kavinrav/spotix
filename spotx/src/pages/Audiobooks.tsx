import { useCallback, useEffect, useState } from 'react'
import { apiBase } from '../lib/api'
import { usePlayer } from '../player/PlayerContext'
import type { TrackRef } from '../types'

type Job = { id: string; title: string; ready: boolean }

function audioUrl(id: string) {
  return `${apiBase()}/api/audio/${id}`
}

export default function Audiobooks() {
  const { actions } = usePlayer()
  const [caps, setCaps] = useState<{ ffmpeg: boolean; yt_dlp: boolean; writable: boolean } | null>(null)
  const [jobs, setJobs] = useState<Job[]>([])
  const [status, setStatus] = useState<string | null>(null)
  const [urlInput, setUrlInput] = useState('')
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [c, j] = await Promise.all([
        fetch(`${apiBase()}/api/capabilities`).then((r) => {
          if (!r.ok) throw new Error(`Capabilities failed: ${r.status}`)
          return r.json()
        }),
        fetch(`${apiBase()}/api/jobs`).then((r) => {
          if (!r.ok) throw new Error(`Jobs failed: ${r.status}`)
          return r.json()
        }),
      ])
      setCaps(c)
      setJobs(j as Job[])
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setStatus(`Cannot reach SpotX backend: ${msg} (Check if server is running on port 8787)`)
    }
  }, [])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 8000)
    return () => clearInterval(t)
  }, [refresh])

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return
    setBusy(true)
    setStatus(null)
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files.item(i)!
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`${apiBase()}/api/convert`, { method: 'POST', body: fd })
        const data = (await res.json()) as { id?: string; error?: string }
        if (!res.ok) throw new Error(data.error ?? 'Upload failed')
        setStatus(`Converted: ${file.name}`)
      }
      await refresh()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Conversion failed')
    } finally {
      setBusy(false)
    }
  }

  async function convertUrl() {
    const url = urlInput.trim()
    if (!url) return
    setBusy(true)
    setStatus(null)
    try {
      const res = await fetch(`${apiBase()}/api/convert-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = (await res.json()) as { id?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'URL import failed')
      setStatus('URL queued and converted.')
      setUrlInput('')
      await refresh()
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'URL import failed')
    } finally {
      setBusy(false)
    }
  }

  function playJob(job: Job) {
    if (!job.ready) return
    const track: TrackRef = {
      kind: 'job',
      id: job.id,
      title: job.title,
      audioUrl: audioUrl(job.id),
      artist: 'Audiobook import',
    }
    actions.playSingle(track)
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft sm:p-8">
        <h2 className="font-display text-lg font-semibold text-ink">Import from this computer</h2>
        <p className="mt-2 text-sm text-plum/85">
          Pick video or audio files you already downloaded (MP4, MKV, MP3, etc.). The C++ server strips video and encodes AAC
          in an M4A container for lightweight background listening.
        </p>

        <label className="mt-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-plum/25 bg-paper/80 px-6 py-10 transition hover:border-plum/40">
          <input
            type="file"
            accept="video/*,audio/*"
            multiple
            className="hidden"
            disabled={busy || caps?.ffmpeg === false}
            onChange={(e) => void uploadFiles(e.target.files)}
          />
          <span className="text-sm font-semibold text-plum">Drop files or click to browse</span>
          <span className="mt-1 text-xs text-plum/60">Multiple files supported</span>
        </label>
      </section>

      <section className="rounded-[2rem] border border-sand bg-white/70 p-6 shadow-soft sm:p-8">
        <h2 className="font-display text-lg font-semibold text-ink">Import from a link</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {caps ? (
            <>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${caps.ffmpeg ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                ffmpeg: {caps.ffmpeg ? 'Ready' : 'Missing'}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${caps.yt_dlp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                yt-dlp: {caps.yt_dlp ? 'Ready' : 'Not Found'}
              </span>
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${caps.writable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                Storage: {caps.writable ? 'Writable' : 'Read-only'}
              </span>
            </>
          ) : (
            <span className="inline-flex items-center rounded-full bg-mist px-2.5 py-0.5 text-xs font-medium text-plum/60 animate-pulse">
              Checking server capabilities...
            </span>
          )}
        </div>

        <p className="mt-4 text-sm text-plum/85">
          Paste a page URL from supported sites. Requires <code className="rounded bg-mist px-1">yt-dlp</code> on the server PATH
          alongside ffmpeg. Respect copyright and site terms.
        </p>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://…"
            className="min-w-0 flex-1 rounded-full border border-sand bg-white px-4 py-2.5 text-sm text-ink shadow-soft outline-none ring-plum/30 focus:ring-2"
            disabled={busy || !caps?.yt_dlp}
          />
          <button
            type="button"
            onClick={() => void convertUrl()}
            disabled={busy || !caps?.yt_dlp || !urlInput.trim()}
            className="rounded-full bg-coral px-6 py-2.5 text-sm font-bold text-white shadow-lift transition enabled:hover:opacity-95 disabled:opacity-40"
          >
            Convert URL
          </button>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <h2 className="font-display text-xl font-semibold text-ink">Your audiobooks</h2>
          <button type="button" onClick={() => void refresh()} className="text-sm font-semibold text-plum hover:underline">
            Refresh
          </button>
        </div>

        <ul className="space-y-2">
          {jobs.length === 0 && <li className="text-sm text-plum/70">Nothing yet — import above.</li>}
          {jobs.map((job) => (
            <li
              key={job.id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-sand bg-white/80 px-4 py-3 shadow-soft"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-ink">{job.title}</p>
                <p className="truncate font-mono text-xs text-plum/50">{job.id}</p>
              </div>
              <button
                type="button"
                disabled={!job.ready}
                onClick={() => playJob(job)}
                className="shrink-0 rounded-xl bg-plum px-4 py-2 text-sm font-semibold text-white transition enabled:hover:bg-plum/90 disabled:opacity-40"
              >
                {job.ready ? 'Play' : '…'}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {status && (
        <div className={`rounded-xl border px-4 py-3 text-sm shadow-soft ${status.includes('failed') || status.includes('Error') || status.includes('Missing') || status.includes('Cannot') ? 'border-red-200 bg-red-50 text-red-900' : 'border-sand bg-mist/50 text-ink'}`} role="status">
          <p className="font-semibold">{status.includes('failed') || status.includes('Error') ? 'Error' : 'Status'}</p>
          <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-xs opacity-80">
            {status}
          </pre>
        </div>
      )}
    </div>
  )
}


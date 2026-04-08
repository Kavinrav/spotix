# SpotX backend (C++)

HTTP API built with [cpp-httplib](https://github.com/yhirose/cpp-httplib). It converts **local uploads** (video or audio) or **remote page URLs** (via optional [yt-dlp](https://github.com/yt-dlp/yt-dlp)) into a single **AAC/M4A** file suitable for audiobook-style background playback in the browser.

## Requirements

- CMake 3.16+
- C++17 (MSVC, Clang, or GCC)
- **FFmpeg** on `PATH` (the `ffmpeg` executable must run from a terminal)
- **yt-dlp** on `PATH` (optional, only for `POST /api/convert-url`)

Windows: [FFmpeg builds](https://ffmpeg.org/download.html) or `winget install FFmpeg`; for URLs, install [yt-dlp](https://github.com/yt-dlp/yt-dlp) and ensure it is on `PATH`.

## Build

```powershell
cd spotx-backend
cmake -B build -DCMAKE_BUILD_TYPE=Release
cmake --build build --config Release
```

Run:

```powershell
.\build\Release\spotx-server.exe
```

Environment:

- `SPOTX_PORT` — listen port (default `8787`)

Data is stored under `./spotx_data/jobs/<id>/` (relative to the process working directory).

## API

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | `{ ok, ffmpeg, yt_dlp }` |
| `GET` | `/api/capabilities` | `{ ffmpeg, yt_dlp }` |
| `GET` | `/api/jobs` | JSON array of `{ id, title, ready }` |
| `POST` | `/api/convert` | `multipart/form-data` with field **`file`** (video or audio from disk) |
| `POST` | `/api/convert-url` | JSON `{ "url": "https://..." }` — requires yt-dlp |
| `GET` | `/api/audio/<id>` | Stream `output.m4a` (`audio/mp4`) |

CORS is enabled for browser dev (`Access-Control-Allow-Origin: *`).

### Legal note

Only download or convert content you have the right to use. Respect platform terms of service and copyright. URL import is provided as a technical capability; you are responsible for compliance.

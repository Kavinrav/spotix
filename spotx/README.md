# SpotX (web)

React + Vite UI for the SpotX C++ server: import local video/audio files, optionally paste supported URLs, then play the resulting M4A in the browser with **Media Session** support for background-friendly playback (OS media keys where the browser exposes them).

## Setup

```powershell
cd spotx
npm install
npm run dev
```

The dev server proxies `/api` and `/health` to `http://127.0.0.1:8787`. Start `spotx-server` from `../spotx-backend` first.

For a production build served from another origin, set:

```env
VITE_API_URL=http://127.0.0.1:8787
```

before `npm run build`.

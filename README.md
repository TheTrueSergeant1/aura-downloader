# Aura

Aura is a desktop media archiver and stream extractor built with **Tauri**, **React**, and a local **FastAPI + yt-dlp** sidecar engine. 

I built this because almost every GUI wrapper for `yt-dlp` and `ffmpeg` either looks like it was designed for Windows XP or locks up the main UI thread while muxing 4K containers. I wanted a native-feeling desktop app with smooth 120Hz spring physics, real-time WebSocket progress telemetry, and one-click presets for editing codecs (like Apple ProRes 422 and lossless FLAC) without touching a terminal.

---

## Features

- **Live Stream Inspector:** Paste a URL from YouTube, Twitch, Vimeo, X, or 1,000+ other sites supported by `yt-dlp` to inspect available video streams, duration, uploader metadata, and embedded chapter counts before downloading.
- **Real-Time WebSocket Telemetry:** Live byte-level progress, transfer speed (MB/s), and ETA streamed over a local WebSocket connection to an expandable Dynamic Island status pill.
- **Multi-Threaded Fragment Engine:** Splits HLS/DASH segments across 8 concurrent download threads so high-bitrate 4K60 streams saturate your connection instead of getting throttled on a single socket.
- **Editor-Ready Post-Processing:**
  - **MP4 (H.264 / VP9 / AV1):** Auto-merges highest available video and audio streams up to 2160p60.
  - **Lossless Audio (`.flac`):** Strips audio streams directly into uncompressed FLAC with embedded thumbnail art and metadata tags.
  - **Apple ProRes (`.mov`):** Transcodes downloaded footage into ProRes 422 (`prores_ks`) so clips can be dropped straight into Premiere Pro or DaVinci Resolve timelines without proxy generation.
- **Automated Chapter Splitting:** Detects embedded chapter timestamps and slices long-form videos or podcasts into separate files automatically.
- **Zero Console Windows:** When compiled for Windows, both the Python sidecar and child `ffmpeg` processes run with `CREATE_NO_WINDOW` flags—no flashing command prompts.

---

## Architecture

Aura splits UI rendering and heavy media I/O into two isolated processes:

1. **Frontend (`frontend/`):** React 18, Tailwind CSS v4, and Framer Motion wrapped in a native Tauri WebView2 window. All layout transitions and queue reordering animations use spring-damping physics rather than linear CSS easing.
2. **Sidecar Engine (`backend/`):** A lightweight Python FastAPI server compiled into a standalone binary via PyInstaller (`aura-engine.exe`). Tauri spawns this binary silently on startup and kills it when the window closes.

```text
aura-downloader/
├── backend/
│   └── main.py              # FastAPI server, WebSocket broadcaster & yt-dlp hooks
└── frontend/
    ├── src/
    │   ├── App.jsx          # Main UI, queue state, and Web Audio synthesizer
    │   └── index.css        # Tailwind v4 imports & custom scrollbars
    └── src-tauri/
        ├── src/main.rs      # Rust lifecycle hooks for spawning/killing Python sidecar
        └── tauri.conf.json  # Bundle configuration & window settings
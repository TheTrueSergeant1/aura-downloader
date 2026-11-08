# Aura Studio

Aura is a desktop media archiver and stream ingest utility built with **Tauri**, **React**, and a local **FastAPI + yt-dlp** sidecar engine.

I built this tool to manage offline media for my personal homelab server and to pull clean reference clips for video editing without dealing with ad-ridden web scrapers or bitrate caps. Aura pairs a multi-threaded Python extraction backend inside a native desktop shell with real-time WebSocket telemetry, dynamic stream probing, and persistent configuration.

---

## Features

### Stream Ingest & Inspection
* **Live Codec & Resolution Probing:** Inspects source URLs before downloading to display available resolution tiers, framerates (30fps/60fps), video codecs (AV1, VP9, H.264), dynamic range (HDR/SDR), and estimated file sizes.
* **Timecode Sub-Clip Extraction (In / Out):** Slice specific timestamp ranges (e.g., 01:15 to 04:30) directly from long-form VODs or lectures using keyframe-accurate cuts without downloading the entire file.
* **Interactive Playlist Batch Picker:** Automatically detects playlists, channels, or multi-part feeds, letting you check or uncheck individual videos, invert selections, and batch-queue them with your chosen export profile.
* **Global Paste Shortcut:** Press `Ctrl+V` anywhere in the Ingest Studio workspace to immediately parse and probe a copied stream link.

### Post-Processing & NLE Workflows
* **4 Master Export Profiles:**
  * **MP4 Master:** Merges highest-bitrate video and audio streams into an `.mp4` container up to 2160p60.
  * **Apple ProRes 422 (.mov):** Transcodes footage into edit-ready ProRes (`prores_ks`) for immediate timeline scrubbing in Premiere Pro or DaVinci Resolve.
  * **FLAC Lossless:** Extracts raw audio streams into uncompressed FLAC with embedded metadata and cover art.
  * **MP3 (320kbps):** Constant-bitrate audio extraction for universal playback.
* **SponsorBlock Integration:** Automatically strips or marks sponsor reads, intros, outros, and self-promotion segments via the SponsorBlock API.
* **Chapter Splitting & Subtitles:** Slices multi-topic videos into individual files using embedded chapter markers and embeds `.srt` closed captions directly into the output container.
* **EBU R128 Loudness Normalization:** Optional `-14 LUFS` audio normalization pass during extraction so all downloaded media plays back at a consistent volume.

### Media Server Automation & Network Control
* **Jellyfin / Plex File Naming:** Supports standardized naming templates (`YYYY-MM-DD - Title [ID].ext`) and optional automatic `/ChannelName/` subfolder grouping so archived files index cleanly on home media servers.
* **Browser Cookie Authentication:** Imports active session cookies directly from Firefox, LibreWolf, Chrome, Edge, or Brave to access age-restricted VODs, member streams, and high-bitrate tier streams.
* **Duplicate Archive Ledger (`archive.txt`):** Tracks downloaded video IDs locally so you never accidentally re-download the same stream twice.
* **Multi-Threaded Fragment Engine:** Configurable concurrent fragment downloading (1x to 16x threads), bandwidth rate limiting, and custom `HTTP`/`SOCKS5` proxy routing.
* **Local Media Vault:** Built-in disk browser that indexes your output directory with file size telemetry, one-click reveal in Windows Explorer, and file management.
* **4 Studio Color Themes:** Quick-toggle between Obsidian Dark, Daylight Studio, OLED Pitch Black, and Broadcast Slate.
---
Architecture
Aura separates UI rendering from heavy disk and network I/O across two isolated processes:
Frontend Shell: React, Tailwind CSS, and Framer Motion running inside a native Tauri desktop window. Communicates with the backend via REST for configuration and probing and a persistent WebSocket connection for live byte-stream progress.
Sidecar Engine: A Python FastAPI server compiled into a standalone Windows executable via PyInstaller. Tauri's Rust core spawns this sidecar silently on launch with hidden console flags and terminates it when the window closes.
```text
aura-downloader/
├── backend/
│   └── main.py              # FastAPI server, WebSocket broadcaster, yt-dlp hooks and config persistence
└── frontend/
    ├── src/
    │   ├── App.jsx          # Studio UI, stream inspector, transfer queue, vault and preferences
    │   └── index.css        # Tailwind setup and theme variables
    └── src-tauri/
        ├── src/main.rs      # Rust process manager for spawning and killing the Python sidecar
        └── tauri.conf.json  # Application bundle and window configuration
```
---
Running Locally on Another Machine
If you downloaded or cloned the source code and want to run it locally without using the pre-compiled release executable, follow these steps:
Prerequisites
Make sure you have the following installed on your system:
Node.js (v18 or higher)
Python (v3.10 or higher)
Rust and Cargo (Required for compiling the Tauri desktop shell)
FFmpeg installed and accessible in your system PATH
1. Start the Backend Engine
Open your first terminal in the root folder, navigate into the backend directory, install the required Python dependencies, and boot the server:
```cmd
cd backend
pip install fastapi uvicorn yt-dlp websockets pydantic
python main.py
```
2. Start the Tauri Desktop Shell
Open a second terminal, navigate into the frontend directory, install the Node modules, and launch the dev environment:
```cmd
cd frontend
npm install
npx tauri dev
```
---
Building the Standalone Executable
To package both the Python backend and Tauri frontend into a single Windows installer with zero console windows:
Compile the Python sidecar binary:
```cmd
   cd backend
   pip install pyinstaller
   pyinstaller --onefile --noconsole --name aura-engine main.py
   mkdir ..\frontend\src-tauri\bin
   copy /Y dist\aura-engine.exe ..\frontend\src-tauri\bin\aura-engine-x86_64-pc-windows-msvc.exe
   ```
Build the Tauri installer:
```cmd
   cd ..\frontend
   npx tauri build
   ```
---
License
MIT

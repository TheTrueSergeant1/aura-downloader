# Aura Studio

> **A professional-grade desktop media archiver and stream ingest utility** built with Tauri, React, and a local FastAPI and `yt-dlp` sidecar engine.

---

## About Aura Studio

Aura Studio was built to solve a very specific problem: managing offline media for a personal homelab server and pulling clean, high-bitrate reference clips for video editing without dealing with ad-ridden web scrapers, annoying popups, or arbitrary resolution caps. 

Aura combines a multi-threaded Python extraction backend inside a native desktop shell with real-time WebSocket telemetry, dynamic stream probing, a full gallery image scraper, and persistent user configuration.

---

## Comprehensive Feature Breakdown

### 1. Stream Ingest & Format Inspector
* **Live Codec & Resolution Probing:** Automatically inspects target URLs before downloading to display available resolution tiers, framerates, video codecs (`AVC1`, `VP9`, `AV01`), dynamic range (`HDR`/`SDR`), and estimated file sizes.
* **Timecode Sub-Clip Extraction:** Slice specific timestamp ranges directly from long-form VODs, lectures, or streams using frame-accurate cuts without downloading the entire file.
* **Interactive Playlist Batch Picker:** Automatically detects playlists, channels, or multi-part feeds, letting you check or uncheck individual videos, filter by title, invert selections, and batch-queue them with your chosen export profile.
* **Global Paste Shortcut (`Ctrl+V`):** Press `Ctrl+V` anywhere in the Ingest Studio or Image Scraper workspace to immediately parse and probe a copied stream link.

### 2. Gallery Image Scraper & Batch Engine
* **Full-Resolution Image Harvesting:** Powered by `gallery-dl` and automated HTML fallback scrapers to harvest complete photo albums, sets, and multi-image galleries from supported platforms (including ImageFap, Imgur, Reddit, and web articles).
* **Memory-Safe Pagination:** Configurable pagination (`12`, `24`, `48`, or `96` images per page) ensures zero UI lag or freezing when browsing massive 500+ image galleries.
* **Parallel Batch Downloader:** Utilizes an adjustable async worker pool (`1x` to `8x` threads) to download full-resolution images concurrently into dedicated vault subfolders.
* **Immersive Lightbox Preview:** Inspect full images in a zoomable lightbox with keyboard arrow navigation (`Left`/`Right`) and quick-selection (`Spacebar`).

### 3. Post-Processing & NLE Editing Workflows
* **4 Master Export Profiles:**
  * **MP4 Master:** Merges highest-bitrate video and audio streams into an MP4 container up to 2160p60.
  * **Apple ProRes 422:** Transcodes footage into edit-ready 10-bit ProRes (.MOV) for immediate timeline scrubbing in Adobe Premiere Pro or DaVinci Resolve.
  * **FLAC Lossless:** Extracts raw audio streams into uncompressed FLAC with embedded metadata and cover art.
  * **MP3 (320kbps):** Constant-bitrate audio extraction for universal playback.
* **SponsorBlock Integration:** Automatically strips or marks sponsor reads, intros, outros, and self-promotion segments via the SponsorBlock API.
* **Chapter Splitting & Subtitles:** Slices multi-topic videos into individual files using embedded chapter markers and embeds closed captions directly into the output container.
* **EBU R128 Loudness Normalization:** Optional audio normalization pass (`-14 LUFS`) during extraction so all downloaded media plays back at a consistent broadcast volume.

### 4. Media Server Automation & Network Control
* **Jellyfin & Plex File Naming:** Supports standardized naming templates, YYYY-MM-DD media server formats, cleaner titles, and automatic subfolder organization so archived files index cleanly on home media servers.
* **Browser Cookie Authentication:** Imports active session cookies directly from Firefox, LibreWolf, Chrome, Edge, or Brave to access age-restricted VODs, member streams, and high-bitrate tiers.
* **Duplicate Archive Ledger:** Tracks downloaded video IDs locally via `archive.txt` so you never accidentally re-download the same stream twice.
* **Multi-Threaded Fragment Engine:** Configurable concurrent fragment downloading, bandwidth rate limiting, network retries, IPv4 forcing, and custom HTTP or SOCKS5 proxy routing.
* **Local Media Vault:** Built-in disk browser that indexes your output directory with category filters (*Video*, *Audio*, *Images*), search filtering, sorting (*Newest*, *Largest*, *Name*), size telemetry, and one-click file management.
* **8 Studio Color Themes & 6 Accent Palettes:** Fully customizable themes (*Obsidian Dark*, *OLED Pitch Black*, *Broadcast Slate*, *Tokyo Night*, *Catppuccin Mocha*, *Dracula Studio*, *Matrix Terminal*, and *Daylight Studio*) with adjustable workspace density and Web Audio API completion chimes.

---
🏛️ Architecture
Aura separates UI rendering from heavy disk and network I/O across two isolated processes:
Frontend Shell: React, Tailwind CSS, and Framer Motion running inside a native Tauri desktop window. Communicates with the backend via REST for configuration and probing and a persistent WebSocket connection for live byte-stream progress.
Sidecar Engine: A Python FastAPI server compiled into a standalone Windows executable via PyInstaller. Tauri's Rust core spawns this sidecar silently on launch with hidden console flags and terminates it when the window closes.
```text
aura-downloader/
├── backend/
│   └── main.py              # FastAPI server, WebSocket broadcaster, yt-dlp/gallery-dl hooks and config persistence
└── frontend/
    ├── src/
    │   ├── App.jsx          # Studio UI, stream inspector, transfer queue, vault and tabbed preferences
    │   └── index.css        # Tailwind setup and dynamic theme variables
    └── src-tauri/
        ├── src/main.rs      # Rust process manager for spawning and killing the Python sidecar
        └── tauri.conf.json  # Application bundle and window configuration
```
---
## Step-by-Step Installation Guide (Assuming Zero Installed Tools)
If you are setting up Aura on a brand-new computer with nothing installed, follow these steps in order:
-- Step 1: Install System Dependencies
Node.js: Download and install the LTS version of Node.js (v18 or higher). Make sure to check the box to install necessary tools during setup.
Python: Download and install Python (v3.10 or higher). Crucial: Check the box at the bottom of the installer that says "Add Python to PATH".
Rust & Cargo: Download and install Rust (required for compiling the Tauri desktop shell). On Windows, follow the prompts to install `rustup`.
FFmpeg: Download FFmpeg from gyan.dev, extract the folder, and add the `bin` directory to your Windows System Environment Variables PATH.
---
Step 2: Clone or Download the Source Code
Open your Windows Command Prompt (`cmd`) and clone the repository or open your project folder:
```cmd
cd E:\Projects
git clone https://github.com/TheTrueSergeant1/aura-downloader.git
cd aura-downloader
```
---
Step 3: Start the Backend Engine
Open your first command prompt window in the root folder, navigate into the backend directory, install the required Python libraries, and boot the server:
```cmd
cd backend
python -m pip install --upgrade pip
pip install fastapi uvicorn yt-dlp gallery-dl websockets pydantic requests curl_cffi "yt-dlp[default,curl-cffi]"
python main.py
```
(You should see uvicorn start running successfully on `http://127.0.0.1:8000`).
---
Step 4: Start the Tauri Desktop Shell
Open a second command prompt window, navigate into the frontend directory, install the Node modules, and launch the development desktop environment:
```cmd
cd frontend
npm install
npx tauri dev
```
(Vite will bundle the React frontend, cargo will compile the Rust wrapper, and Aura Studio will launch as a native desktop window).
---
📦 Building the Standalone Release Executable
To package both the Python backend and Tauri frontend into a single standalone Windows executable and installer:
Compile the Python Sidecar Binary:
```cmd
   cd backend
   pip install pyinstaller
   pyinstaller --onefile --noconsole --collect-all curl_cffi --hidden-import=yt_dlp.networking._curlcffi --name aura-engine main.py
   copy /Y dist\aura-engine.exe ..\frontend\src-tauri\bin\aura-engine-x86_64-pc-windows-msvc.exe
   ```
Build the Tauri Installer:
```cmd
   cd ..\frontend
   npx tauri build
   ```
(The final standalone `.msi` and `.exe` installers will be generated inside `frontend/src-tauri/target/release/bundle/`).
---
📄 License
Distributed under the MIT License. See `LICENSE` for more information.
Maintained by Daniel Castleberry (`TheTrueSergeant1`).

import sys
import io

if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

import os
import uuid
import asyncio
import subprocess
from pathlib import Path
from typing import Optional, List
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

# Prevent ffmpeg/yt-dlp from flashing black console windows on Windows when bundled as an .exe
if sys.platform == "win32":
    _orig_popen = subprocess.Popen

    class _SilentPopen(_orig_popen):
        def __init__(self, *args, **kwargs):
            if "creationflags" not in kwargs:
                kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            super().__init__(*args, **kwargs)

    subprocess.Popen = _SilentPopen

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Default to user's Downloads/Aura folder if running as a frozen PyInstaller binary,
# otherwise keep it local in ./downloads for dev
if getattr(sys, "frozen", False):
    DOWNLOAD_DIR = Path.home() / "Downloads" / "Aura"
else:
    DOWNLOAD_DIR = Path(__file__).parent / "downloads"

DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)


class SocketManager:
    def __init__(self):
        self.clients: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.clients.append(ws)

    def remove(self, ws: WebSocket):
        if ws in self.clients:
            self.clients.remove(ws)

    async def push(self, payload: dict):
        # Prune dead sockets on the fly so a refreshed frontend doesn't crash the hook loop
        stale = []
        for client in self.clients:
            try:
                await client.send_json(payload)
            except Exception:
                stale.append(client)
        for s in stale:
            self.remove(s)


ws_manager = SocketManager()


class ProbePayload(BaseModel):
    url: str


class JobPayload(BaseModel):
    url: str
    title: str
    thumbnail: Optional[str] = ""
    mode: str = "video"          # video | audio | prores
    resolution: str = "2160"
    multithread: bool = True
    split_chapters: bool = False
    hw_accel: bool = True
    embed_metadata: bool = True
    speed_limit_mb: Optional[float] = None


@app.websocket("/ws")
async def ws_stream(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Keep alive - client doesn't actually send anything right now
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.remove(websocket)


@app.post("/api/analyze")
async def analyze_url(req: ProbePayload):
    def _probe():
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": False,
            "skip_download": True,
        }
        with yt_dlp.YoutubeDL(opts) as ydl:
            return ydl.extract_info(req.url, download=False)

    try:
        # Run in worker thread because yt-dlp's network calls block the main event loop
        info = await asyncio.to_thread(_probe)
        formats = info.get("formats", [])
        
        # Grab unique vertical resolutions and sort highest first
        heights = sorted(
            list({f.get("height") for f in formats if f.get("height")}),
            reverse=True,
        )
        chapters = info.get("chapters") or []

        return {
            "title": info.get("title", "Untitled Media"),
            "uploader": info.get("uploader", "Unknown Channel"),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail", ""),
            "view_count": info.get("view_count", 0),
            "chapters": len(chapters),
            "available_heights": heights[:6],
            "webpage_url": info.get("webpage_url", req.url),
        }
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.post("/api/download")
async def queue_download(req: JobPayload):
    job_id = str(uuid.uuid4())
    main_loop = asyncio.get_running_loop()

    async def _worker():
        await ws_manager.push({
            "id": job_id,
            "title": req.title,
            "thumbnail": req.thumbnail,
            "status": "starting",
            "percent": 0,
            "speed_mb": 0,
            "eta": 0,
            "size_mb": 0,
        })

        # yt-dlp triggers this hook from its own thread, so we have to bridge back
        # to FastAPI's event loop via run_coroutine_threadsafe
        def _on_progress(d):
            if d["status"] == "downloading":
                done = d.get("downloaded_bytes", 0)
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                spd = d.get("speed") or 0
                eta = d.get("eta") or 0
                pct = round((done / total) * 100, 1) if total > 0 else 0.0

                asyncio.run_coroutine_threadsafe(
                    ws_manager.push({
                        "id": job_id,
                        "title": req.title,
                        "thumbnail": req.thumbnail,
                        "status": "downloading",
                        "percent": min(pct, 99.9),
                        "speed_mb": round(spd / (1024 * 1024), 2),
                        "eta": int(eta),
                        "size_mb": round(total / (1024 * 1024), 1) if total else 0,
                    }),
                    main_loop,
                )

            elif d["status"] == "finished":
                # Download is done, but ffmpeg still needs to mux audio+video or split chapters
                asyncio.run_coroutine_threadsafe(
                    ws_manager.push({
                        "id": job_id,
                        "title": req.title,
                        "thumbnail": req.thumbnail,
                        "status": "processing",
                        "percent": 100.0,
                        "speed_mb": 0,
                        "eta": 0,
                        "size_mb": round((d.get("total_bytes") or 0) / (1024 * 1024), 1),
                    }),
                    main_loop,
                )

        def _run_ydl():
            out_template = str(DOWNLOAD_DIR / "%(title)s [%(id)s].%(ext)s")
            pp_chain = []

            if req.mode == "audio":
                fmt = "bestaudio/best"
                pp_chain.append({
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "flac",
                    "preferredquality": "0",
                })
            elif req.mode == "prores":
                fmt = "bestvideo+bestaudio/best"
                pp_chain.append({
                    "key": "FFmpegVideoConvertor",
                    "preferedformat": "mov",  # typo is intentional, yt-dlp spells it 'preferedformat'
                })
            else:
                h = req.resolution
                fmt = f"bestvideo[height<={h}]+bestaudio/best[height<={h}]/best"

            if req.embed_metadata:
                pp_chain.append({"key": "FFmpegMetadata", "add_metadata": True})

            if req.split_chapters:
                pp_chain.append({"key": "FFmpegSplitChapters", "force_keyframes": False})

            ydl_opts = {
                "format": fmt,
                "outtmpl": out_template,
                "merge_output_format": "mp4" if req.mode == "video" else None,
                "progress_hooks": [_on_progress],
                "concurrent_fragment_downloads": 8 if req.multithread else 1,
                "postprocessors": pp_chain,
                "quiet": True,
                "no_warnings": True,
            }

            if req.speed_limit_mb and req.speed_limit_mb > 0:
                ydl_opts["ratelimit"] = int(req.speed_limit_mb * 1024 * 1024)

            # ProRes 422 HQ profile for Premiere / Resolve timelines
            if req.hw_accel and req.mode == "prores":
                ydl_opts["postprocessor_args"] = {
                    "videoconvertor": ["-c:v", "prores_ks", "-profile:v", "3"]
                }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([req.url])

        try:
            await asyncio.to_thread(_run_ydl)
            await ws_manager.push({
                "id": job_id,
                "title": req.title,
                "thumbnail": req.thumbnail,
                "status": "completed",
                "percent": 100.0,
                "speed_mb": 0,
                "eta": 0,
            })
        except Exception as err:
            await ws_manager.push({
                "id": job_id,
                "title": req.title,
                "thumbnail": req.thumbnail,
                "status": "error",
                "error": str(err),
                "percent": 0,
                "speed_mb": 0,
                "eta": 0,
            })

    asyncio.create_task(_worker())
    return {"task_id": job_id, "status": "queued"}


@app.post("/api/open-folder")
async def open_output_dir():
    target = str(DOWNLOAD_DIR.resolve())
    if sys.platform == "win32":
        os.startfile(target)
    elif sys.platform == "darwin":
        subprocess.Popen(["open", target])
    else:
        subprocess.Popen(["xdg-open", target])
    return {"opened": target}


if __name__ == "__main__":
    import uvicorn
    # Workers must stay at 1 when bundled with PyInstaller so websocket state stays in-memory
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
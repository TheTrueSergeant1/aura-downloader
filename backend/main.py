import sys
import io

# PyInstaller --noconsole sets stdout/stderr to None, which crashes uvicorn's tty check
if sys.stdout is None:
    sys.stdout = io.StringIO()
if sys.stderr is None:
    sys.stderr = io.StringIO()

import os
import re
import html
import time
import json
import uuid
import glob
import socket
import shutil
import asyncio
import tempfile
import subprocess
from pathlib import Path
from datetime import datetime
from typing import Optional, List, Dict, Set
from urllib.parse import urlparse, urlunparse, urljoin, unquote

import requests
import websockets
import yt_dlp
from yt_dlp.utils import download_range_func, decode_packed_codes
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

try:
    from curl_cffi import requests as cffi_requests
    HAS_CURL_CFFI = True
except ImportError:
    cffi_requests = None
    HAS_CURL_CFFI = False

try:
    from yt_dlp.networking.impersonate import ImpersonateTarget
    HAS_IMPERSONATE_TARGET = True
except ImportError:
    ImpersonateTarget = None
    HAS_IMPERSONATE_TARGET = False

# Suppress flashing console windows on Windows when spawning ffmpeg, ffprobe, gallery-dl, or powershell
_orig_popen = subprocess.Popen
if sys.platform == "win32":
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

# Resolve storage paths depending on frozen PyInstaller state vs local dev
IS_FROZEN = getattr(sys, "frozen", False)
if IS_FROZEN:
    APP_DATA_DIR = Path(os.getenv("APPDATA", Path.home())) / "Aura"
    DEFAULT_DOWNLOAD_DIR = Path.home() / "Downloads" / "Aura"
else:
    APP_DATA_DIR = Path(__file__).parent
    DEFAULT_DOWNLOAD_DIR = Path(__file__).parent / "downloads"

APP_DATA_DIR.mkdir(parents=True, exist_ok=True)
DEFAULT_DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

CONFIG_FILE = APP_DATA_DIR / "config.json"
ARCHIVE_FILE = APP_DATA_DIR / "archive.txt"
CF_PROFILE_DIR = APP_DATA_DIR / "cf_browser_profile"

DEFAULT_CONFIG = {
    # Appearance & Personalization
    "theme": "dark",                           # dark | oled | nord | tokyo | catppuccin | dracula | emerald | light
    "accent_color": "white",                   # white | emerald | sky | violet | amber | rose
    "ui_density": "comfortable",               # compact | comfortable | spacious
    "reduce_motion": False,
    "show_header_telemetry": True,
    "auto_paste_probe": True,                  # Automatically probe URL on global Ctrl+V
    # Audio Telemetry
    "audio_sfx": True,
    "sfx_style": "chime",                      # chime | synth | minimal
    "sfx_volume": 70,                          # 10 - 100
    # Storage & Automation
    "download_dir": str(DEFAULT_DOWNLOAD_DIR.resolve()),
    "naming_template": "standard",             # standard | media_server | clean | channel_title | id_only
    "restrict_filenames": False,               # ASCII-safe filenames without spaces/special chars
    "organizer_subfolder": False,              # Group video files into /Uploader/ subfolders
    "write_info_json": False,                  # Save .info.json metadata sidecar file
    "auto_open_folder": False,                 # Open destination folder when a job completes
    "use_archive": False,                      # Skip previously downloaded IDs via archive.txt
    # Video & Audio Mastering
    "default_export_mode": "video",            # video | prores | audio_flac | audio_mp3
    "default_resolution": "2160",              # 2160 | 1440 | 1080 | 720
    "preferred_fps": "any",                    # any | 60 | 30
    "preferred_video_codec": "auto",           # auto | avc1 | vp9 | av01
    "preferred_container": "mp4",              # mp4 | mkv | webm
    "default_sponsorblock": "none",            # none | remove | mark
    "embed_metadata": True,
    "embed_thumbnail": True,
    "write_subs": False,
    "sub_lang": "en",
    "normalize_audio": False,                  # EBU R128 -14 LUFS loudnorm pass
    "hw_accel": True,
    # Image Scraper Engine
    "image_page_size": 24,                     # 12 | 24 | 48 | 96 images rendered per page
    "image_concurrency": 4,                    # 1 - 8 parallel image downloads
    "image_naming_scheme": "indexed_original", # indexed_original | original | sequential
    "image_subfolder_per_gallery": True,       # Save each scraped gallery into its own folder
    "image_auto_proxy": True,                  # Auto-enable Referer proxy on protected hosts
    # Network & Anti-Bot
    "concurrent_fragments": 8,                 # 1 - 16
    "network_retries": 5,                      # 3 | 5 | 10 | 20
    "socket_timeout": 30,                      # 15 | 30 | 60 seconds
    "speed_limit_mb": 0,                       # 0 = unlimited
    "cookies_browser": "none",                 # none | firefox | librewolf | chrome | edge | brave | vivaldi | opera
    "proxy_url": "",
    "force_ipv4": False,
}

USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/131.0.0.0 Safari/537.36"
)


def load_config() -> dict:
    if CONFIG_FILE.exists():
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                saved = json.load(f)
                merged = {**DEFAULT_CONFIG, **saved}
                if not merged.get("download_dir"):
                    merged["download_dir"] = str(DEFAULT_DOWNLOAD_DIR.resolve())
                return merged
        except Exception:
            pass
    return DEFAULT_CONFIG.copy()


def save_config(cfg: dict) -> dict:
    merged = {**DEFAULT_CONFIG, **cfg}
    if not merged.get("download_dir"):
        merged["download_dir"] = str(DEFAULT_DOWNLOAD_DIR.resolve())
    target_dir = Path(merged["download_dir"])
    target_dir.mkdir(parents=True, exist_ok=True)
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(merged, f, indent=2)
    return merged


def get_archive_count() -> int:
    if not ARCHIVE_FILE.exists():
        return 0
    try:
        with open(ARCHIVE_FILE, "r", encoding="utf-8") as f:
            return sum(1 for line in f if line.strip())
    except Exception:
        return 0


def resolve_gallery_dl_bin() -> str:
    found = shutil.which("gallery-dl")
    if found:
        return found
    candidates = [
        Path(sys.executable).parent / "Scripts" / "gallery-dl.exe",
        Path.home() / "AppData" / "Local" / "Programs" / "Python" / "Python313" / "Scripts" / "gallery-dl.exe",
        Path.home() / "AppData" / "Roaming" / "Python" / "Python313" / "Scripts" / "gallery-dl.exe",
    ]
    for c in candidates:
        if c.exists():
            return str(c)
    return "gallery-dl"


def _apply_impersonate_opts(opts: dict) -> None:
    """Configures yt-dlp options with valid browser TLS impersonation targets."""
    opts["extractor_args"] = {"generic": {"impersonate": ["chrome"]}}
    if HAS_IMPERSONATE_TARGET and ImpersonateTarget is not None:
        try:
            opts["impersonate"] = ImpersonateTarget.from_str("chrome")
        except Exception:
            pass


def _http_get_text(url: str, headers: Optional[dict] = None, timeout: int = 20, is_navigation: bool = False) -> str:
    """Fetches webpage HTML using curl_cffi without corrupting native browser TLS/client-hint headers."""
    proxies = {"http": app_config["proxy_url"], "https": app_config["proxy_url"]} if app_config.get("proxy_url") else None

    if HAS_CURL_CFFI and cffi_requests is not None:
        targets = ["chrome", "chrome124", "chrome120", "safari", "firefox"]
        last_err = None
        for target in targets:
            try:
                with cffi_requests.Session(impersonate=target, proxies=proxies) as sess:
                    req_hdrs = None if is_navigation else headers
                    resp = sess.get(url, headers=req_hdrs, timeout=timeout, allow_redirects=True)
                    if resp.status_code == 200 and "Just a moment..." not in resp.text[:1500]:
                        return resp.text
                    resp.raise_for_status()
            except Exception as err:
                last_err = err
                continue
        if last_err and not is_navigation:
            raise last_err

    req_headers = {"User-Agent": USER_AGENT, **(headers or {})}
    resp = requests.get(url, headers=req_headers, proxies=proxies, timeout=timeout)
    resp.raise_for_status()
    return resp.text


def _find_chromium_binary() -> Optional[str]:
    """Finds an installed Chromium-based browser (Edge, Chrome, Brave) on the machine."""
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        str(Path.home() / r"AppData\Local\Google\Chrome\Application\chrome.exe"),
        r"C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    for name in ("msedge", "chrome", "brave"):
        found = shutil.which(name)
        if found:
            return found
    return None


def _get_free_port() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


async def _cdp_extract_page(ws_url: str, timeout_sec: float = 14.0) -> dict:
    """Connects to the browser tab via CDP WebSocket and waits for Cloudflare/player initialization."""
    js_expr = """
    (() => {
        const html = document.documentElement ? document.documentElement.outerHTML : '';
        const title = document.title || '';
        const res = performance.getEntriesByType('resource').map(r => r.name);
        const streams = res.filter(u => u.includes('.m3u8') || u.includes('.mp4'));
        const videoEl = document.querySelector('video');
        if (videoEl && videoEl.src && (videoEl.src.includes('.m3u8') || videoEl.src.includes('.mp4'))) {
            streams.push(videoEl.src);
        }
        return JSON.stringify({
            title,
            html,
            streams,
            ua: navigator.userAgent
        });
    })()
    """
    async with websockets.connect(ws_url, max_size=50 * 1024 * 1024) as ws:
        msg_id = 1
        await ws.send(json.dumps({"id": msg_id, "method": "Network.enable"}))
        await ws.recv()

        deadline = time.monotonic() + timeout_sec
        last_data = {"title": "", "html": "", "streams": [], "ua": USER_AGENT}

        while time.monotonic() < deadline:
            msg_id += 1
            await ws.send(json.dumps({
                "id": msg_id,
                "method": "Runtime.evaluate",
                "params": {"expression": js_expr, "returnByValue": True},
            }))

            while True:
                raw_msg = await asyncio.wait_for(ws.recv(), timeout=3.0)
                resp = json.loads(raw_msg)
                if resp.get("id") == msg_id:
                    val = resp.get("result", {}).get("result", {}).get("value")
                    if val:
                        last_data = json.loads(val)
                    break

            html_str = last_data.get("html") or ""
            title_str = last_data.get("title") or ""
            streams = last_data.get("streams") or []

            if title_str and "Just a moment" not in title_str and "Attention Required" not in title_str:
                if streams or ".m3u8" in html_str or "eval(function(p,a,c,k,e,d)" in html_str:
                    break

            await asyncio.sleep(0.6)

        return last_data


def _fetch_via_browser_cdp(page_url: str) -> Optional[dict]:
    """Spawns an off-screen Chromium session via CDP to solve Cloudflare JS challenges automatically."""
    browser_bin = _find_chromium_binary()
    if not browser_bin:
        return None

    port = _get_free_port()
    CF_PROFILE_DIR.mkdir(parents=True, exist_ok=True)

    args = [
        browser_bin,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={CF_PROFILE_DIR}",
        "--disable-blink-features=AutomationControlled",
        "--no-first-run",
        "--no-default-browser-check",
        "--mute-audio",
        "--window-position=-32000,-32000",
        "--window-size=1280,720",
        page_url,
    ]

    proc = None
    try:
        if sys.platform == "win32":
            si = subprocess.STARTUPINFO()
            si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
            si.wShowWindow = 7  # SW_SHOWMINNOACTIVE
            proc = _orig_popen(args, startupinfo=si, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            proc = _orig_popen(args, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        ws_url = None
        for _ in range(25):
            try:
                r = requests.get(f"http://127.0.0.1:{port}/json", timeout=1.0)
                if r.status_code == 200:
                    tabs = r.json()
                    for t in tabs:
                        if t.get("type") == "page" and t.get("webSocketDebuggerUrl"):
                            ws_url = t["webSocketDebuggerUrl"]
                            break
                    if ws_url:
                        break
            except Exception:
                pass
            time.sleep(0.3)

        if not ws_url:
            return None

        return asyncio.run(_cdp_extract_page(ws_url, timeout_sec=14.0))
    except Exception:
        return None
    finally:
        if proc is not None:
            try:
                proc.terminate()
                proc.wait(timeout=3)
            except Exception:
                try:
                    proc.kill()
                except Exception:
                    pass


def _unpack_all_js(raw_html: str) -> str:
    """Unpacks eval(function(p,a,c,k,e,d){...}) obfuscated JS blocks."""
    chunks = [raw_html]
    try:
        decoded = decode_packed_codes(raw_html)
        if decoded:
            chunks.append(decoded)
    except Exception:
        pass

    pattern = re.compile(
        r"}\(\s*(['\"])((?:\\.|(?!\1).)*)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(['\"])((?:\\.|(?!\5).)*)\5\.split\(['\"]\|['\"]\)",
        re.DOTALL,
    )
    chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

    def _base_encode(num: int, b: int) -> str:
        if num == 0:
            return "0"
        out = []
        while num > 0:
            num, rem = divmod(num, b)
            out.append(chars[rem])
        return "".join(reversed(out))

    for m in pattern.finditer(raw_html):
        payload, radix_s, _, symtab_s = m.group(2), m.group(3), m.group(4), m.group(6)
        payload = payload.replace(r"\'", "'").replace(r'\"', '"')
        try:
            radix = int(radix_s)
            symtab = symtab_s.split("|")
            lookup = {}
            for i, val in enumerate(symtab):
                key = _base_encode(i, radix)
                lookup[key] = val if val else key

            unpacked = re.sub(r"\b[0-9a-zA-Z]+\b", lambda wm: lookup.get(wm.group(0), wm.group(0)), payload)
            chunks.append(unpacked)
        except Exception:
            continue

    uuid_match = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", "\n".join(chunks), re.I)
    if uuid_match and ("surrit" in raw_html or "missav" in raw_html):
        chunks.append(f"https://surrit.com/{uuid_match.group(1)}/playlist.m3u8")

    combined = "\n".join(chunks)
    return combined.replace(r"\/", "/")


resolved_stream_cache: Dict[str, dict] = {}


def _resolve_cloudflare_stream(page_url: str) -> Optional[dict]:
    """Bypasses Cloudflare via clean curl_cffi or Chromium CDP and extracts embedded HLS (.m3u8) or MP4 streams."""
    if page_url in resolved_stream_cache:
        return resolved_stream_cache[page_url]

    parsed = urlparse(page_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    raw_html = ""
    cdp_streams: List[str] = []
    active_ua = USER_AGENT

    try:
        raw_html = _http_get_text(page_url, is_navigation=True)
    except Exception:
        raw_html = ""

    expanded_source = _unpack_all_js(raw_html) if raw_html else ""
    m3u8_matches = re.findall(r'https?://[^\s"\'<>\\]+\.m3u8(?:\?[^\s"\'<>\\]*)?', expanded_source, re.I)
    mp4_matches = re.findall(r'https?://[^\s"\'<>\\]+\.mp4(?:\?[^\s"\'<>\\]*)?', expanded_source, re.I)

    if not m3u8_matches and not mp4_matches:
        cdp_res = _fetch_via_browser_cdp(page_url)
        if cdp_res:
            raw_html = cdp_res.get("html") or raw_html
            cdp_streams = cdp_res.get("streams") or []
            active_ua = cdp_res.get("ua") or USER_AGENT
            expanded_source = _unpack_all_js(raw_html)
            m3u8_matches = cdp_streams + re.findall(r'https?://[^\s"\'<>\\]+\.m3u8(?:\?[^\s"\'<>\\]*)?', expanded_source, re.I)
            mp4_matches = re.findall(r'https?://[^\s"\'<>\\]+\.mp4(?:\?[^\s"\'<>\\]*)?', expanded_source, re.I)

    if not m3u8_matches and not mp4_matches:
        return None

    og_title = re.search(r'<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.I)
    if not og_title:
        og_title = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.I | re.S)
    title = html.unescape(og_title.group(1).strip()) if og_title else "Extracted Stream"

    og_thumb = re.search(r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']', raw_html, re.I)
    thumbnail = html.unescape(og_thumb.group(1).strip()) if og_thumb else ""

    stream_url = None
    if m3u8_matches:
        for candidate in m3u8_matches:
            if "playlist.m3u8" in candidate.lower() or "master.m3u8" in candidate.lower():
                stream_url = candidate
                break
        if not stream_url:
            stream_url = m3u8_matches[0]
    elif mp4_matches:
        stream_url = mp4_matches[0]

    if not stream_url:
        return None

    resolved = {
        "stream_url": stream_url,
        "title": title,
        "thumbnail": thumbnail,
        "uploader": parsed.netloc.replace("www.", ""),
        "referer": page_url,
        "origin": origin,
        "user_agent": active_ua,
    }
    resolved_stream_cache[page_url] = resolved
    return resolved


def _parse_m3u8_tiers_fallback(m3u8_url: str, referer: str, origin: str) -> List[dict]:
    """Directly parses #EXT-X-STREAM-INF resolution tiers from an HLS master playlist if yt-dlp probe fails."""
    try:
        text = _http_get_text(m3u8_url, headers={"Referer": referer, "Origin": origin}, is_navigation=False)
        tiers_by_h = {}
        for line in text.splitlines():
            if line.startswith("#EXT-X-STREAM-INF:"):
                res_m = re.search(r"RESOLUTION=(\d+)x(\d+)", line, re.I)
                if res_m:
                    w, h = int(res_m.group(1)), int(res_m.group(2))
                    short_side = min(w, h) if w > h else h
                    tiers_by_h[short_side] = {
                        "height": short_side,
                        "fps": 30,
                        "vcodec": "AVC1",
                        "ext": "mp4",
                        "size_mb": None,
                        "size_bytes": 0,
                        "dynamic_range": "SDR",
                    }
        if tiers_by_h:
            return [tiers_by_h[k] for k in sorted(tiers_by_h.keys(), reverse=True)]
    except Exception:
        pass
    return [
        {"height": 1080, "fps": 30, "vcodec": "AVC1", "ext": "mp4", "size_mb": None, "size_bytes": 0, "dynamic_range": "SDR"},
        {"height": 720, "fps": 30, "vcodec": "AVC1", "ext": "mp4", "size_mb": None, "size_bytes": 0, "dynamic_range": "SDR"},
        {"height": 480, "fps": 30, "vcodec": "AVC1", "ext": "mp4", "size_mb": None, "size_bytes": 0, "dynamic_range": "SDR"},
    ]


app_config = load_config()
cancelled_jobs: Set[str] = set()
job_registry: Dict[str, "JobPayload"] = {}


class JobCancelledError(Exception):
    pass


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
        stale = []
        for client in self.clients:
            try:
                await client.send_json(payload)
            except Exception:
                stale.append(client)
        for s in stale:
            self.remove(s)


ws_manager = SocketManager()


class ImageGalleryProbe(BaseModel):
    url: str


class ImageBatchDownload(BaseModel):
    image_urls: List[str]
    folder_name: Optional[str] = "Image Vault"
    source_url: Optional[str] = ""


class ProbePayload(BaseModel):
    url: str


class JobPayload(BaseModel):
    url: str
    title: str
    uploader: Optional[str] = ""
    thumbnail: Optional[str] = ""
    mode: str = "video"                  # video | audio_flac | audio_mp3 | prores
    resolution: str = "2160"
    multithread: bool = True
    split_chapters: bool = False
    hw_accel: bool = True
    embed_metadata: bool = True
    embed_thumbnail: bool = True
    write_subs: bool = False
    normalize_audio: bool = False
    use_archive: bool = False
    sponsorblock: str = "none"           # none | remove | mark
    trim_enabled: bool = False
    trim_start: Optional[str] = ""       # MM:SS or HH:MM:SS
    trim_end: Optional[str] = ""


class BatchJobPayload(BaseModel):
    items: List[JobPayload]


def parse_timecode(tc: str) -> Optional[float]:
    if not tc or not tc.strip():
        return None
    parts = [p.strip() for p in tc.strip().split(":")]
    try:
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + float(parts[2])
        elif len(parts) == 2:
            return int(parts[0]) * 60 + float(parts[1])
        elif len(parts) == 1:
            return float(parts[0])
    except ValueError:
        return None
    return None


@app.websocket("/ws")
async def ws_stream(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.remove(websocket)


@app.get("/api/system")
async def get_system_status():
    dl_path = Path(app_config["download_dir"])
    dl_path.mkdir(parents=True, exist_ok=True)
    disk = shutil.disk_usage(dl_path)
    ffmpeg_path = shutil.which("ffmpeg")
    gdl_path = shutil.which("gallery-dl")

    return {
        "yt_dlp_version": yt_dlp.version.__version__,
        "ffmpeg_available": ffmpeg_path is not None,
        "ffmpeg_path": ffmpeg_path or "Not found in system PATH",
        "gallery_dl_available": gdl_path is not None,
        "curl_cffi_available": HAS_CURL_CFFI,
        "disk_free_gb": round(disk.free / (1024 ** 3), 1),
        "disk_total_gb": round(disk.total / (1024 ** 3), 1),
        "download_dir": str(dl_path.resolve()),
        "archive_count": get_archive_count(),
    }


@app.post("/api/archive/clear")
async def clear_archive_ledger():
    if ARCHIVE_FILE.exists():
        ARCHIVE_FILE.unlink()
    return {"cleared": True, "archive_count": 0}


@app.get("/api/settings")
async def get_settings():
    return app_config


@app.post("/api/settings")
async def update_settings(new_settings: Dict):
    global app_config
    try:
        app_config = save_config(new_settings)
        return app_config
    except Exception as err:
        raise HTTPException(status_code=400, detail=f"Invalid configuration: {err}")


@app.post("/api/settings/reset")
async def reset_settings_to_defaults():
    global app_config
    app_config = save_config(DEFAULT_CONFIG.copy())
    return app_config


@app.post("/api/pick-folder")
async def pick_output_folder():
    def _ask_dir():
        initial = app_config.get("download_dir", str(DEFAULT_DOWNLOAD_DIR))
        try:
            import tkinter as tk
            from tkinter import filedialog
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            selected = filedialog.askdirectory(initialdir=initial, title="Select Aura Output Directory")
            root.destroy()
            return selected
        except Exception:
            if sys.platform == "win32":
                ps_script = (
                    "Add-Type -AssemblyName System.Windows.Forms; "
                    "$f = New-Object System.Windows.Forms.FolderBrowserDialog; "
                    f"$f.SelectedPath = '{initial}'; "
                    "if ($f.ShowDialog() -eq 'OK') { Write-Output $f.SelectedPath }"
                )
                res = subprocess.run(["powershell", "-NoProfile", "-Command", ps_script], capture_output=True, text=True)
                return res.stdout.strip()
            return None

    chosen = await asyncio.to_thread(_ask_dir)
    if chosen:
        norm_path = str(Path(chosen).resolve())
        return {"path": norm_path}
    return {"path": None}


@app.post("/api/analyze")
async def analyze_url(req: ProbePayload):
    def _probe():
        opts = {
            "quiet": True,
            "no_warnings": True,
            "extract_flat": "in_playlist",
            "skip_download": True,
            "socket_timeout": int(app_config.get("socket_timeout", 30)),
        }
        _apply_impersonate_opts(opts)

        if app_config.get("force_ipv4"):
            opts["source_address"] = "0.0.0.0"
        if app_config.get("cookies_browser") not in (None, "none", ""):
            opts["cookiesfrombrowser"] = (app_config["cookies_browser"],)
        if app_config.get("proxy_url"):
            opts["proxy"] = app_config["proxy_url"]

        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(req.url, download=False)
        except Exception as first_err:
            if "cookiesfrombrowser" in opts:
                opts.pop("cookiesfrombrowser", None)
                try:
                    with yt_dlp.YoutubeDL(opts) as ydl:
                        return ydl.extract_info(req.url, download=False)
                except Exception:
                    pass

            resolved = _resolve_cloudflare_stream(req.url)
            if not resolved:
                raise first_err

            fallback_opts = {
                "quiet": True,
                "no_warnings": True,
                "skip_download": True,
                "socket_timeout": int(app_config.get("socket_timeout", 30)),
                "http_headers": {
                    "User-Agent": resolved.get("user_agent", USER_AGENT),
                    "Referer": resolved["referer"],
                    "Origin": resolved["origin"],
                },
            }
            _apply_impersonate_opts(fallback_opts)
            if app_config.get("proxy_url"):
                fallback_opts["proxy"] = app_config["proxy_url"]

            try:
                with yt_dlp.YoutubeDL(fallback_opts) as ydl:
                    info = ydl.extract_info(resolved["stream_url"], download=False)
                    info["title"] = resolved["title"] or info.get("title")
                    info["thumbnail"] = resolved["thumbnail"] or info.get("thumbnail")
                    info["uploader"] = resolved["uploader"] or info.get("uploader")
                    info["webpage_url"] = req.url
                    return info
            except Exception:
                tiers = _parse_m3u8_tiers_fallback(resolved["stream_url"], resolved["referer"], resolved["origin"])
                return {
                    "_direct_resolved": True,
                    "is_playlist": False,
                    "id": Path(urlparse(req.url).path).name or "stream",
                    "title": resolved["title"],
                    "uploader": resolved["uploader"],
                    "upload_date": "",
                    "duration": 0,
                    "thumbnail": resolved["thumbnail"],
                    "view_count": 0,
                    "extractor": "HLS",
                    "chapters": [],
                    "stream_tiers": tiers,
                    "has_subtitles": False,
                    "webpage_url": req.url,
                }

    try:
        info = await asyncio.to_thread(_probe)
        if info.get("_direct_resolved"):
            info.pop("_direct_resolved", None)
            return info

        if info.get("_type") == "playlist" or "entries" in info:
            raw_entries = [e for e in (info.get("entries") or []) if e]
            playlist_items = []
            for idx, entry in enumerate(raw_entries[:150]):
                entry_url = entry.get("url") or entry.get("webpage_url")
                if entry_url and not entry_url.startswith("http"):
                    entry_url = f"https://www.youtube.com/watch?v={entry.get('id', '')}"
                thumbs = entry.get("thumbnails") or []
                thumb_url = entry.get("thumbnail") or (thumbs[-1].get("url") if thumbs else "")

                playlist_items.append({
                    "index": idx + 1,
                    "id": entry.get("id", str(idx)),
                    "title": entry.get("title") or f"Stream Item #{idx + 1}",
                    "duration": entry.get("duration") or 0,
                    "uploader": entry.get("uploader") or entry.get("channel") or info.get("uploader") or "Playlist",
                    "url": entry_url or req.url,
                    "thumbnail": thumb_url,
                })

            return {
                "is_playlist": True,
                "id": info.get("id", ""),
                "title": info.get("title", "Playlist Feed"),
                "uploader": info.get("uploader") or info.get("channel") or "Playlist",
                "extractor": (info.get("extractor_key") or "Playlist").upper(),
                "entries": playlist_items,
                "webpage_url": info.get("webpage_url", req.url),
            }

        formats = info.get("formats", [])
        res_map = {}
        for f in formats:
            h = f.get("height")
            vcodec = f.get("vcodec")
            if h and vcodec and vcodec != "none":
                fps = f.get("fps") or 30
                size = f.get("filesize") or f.get("filesize_approx") or 0
                existing = res_map.get(h)
                if not existing or size > existing["size_bytes"]:
                    res_map[h] = {
                        "height": h,
                        "fps": int(fps),
                        "vcodec": vcodec.split(".")[0].upper(),
                        "ext": f.get("ext", "mp4"),
                        "size_mb": round(size / (1024 * 1024), 1) if size else None,
                        "size_bytes": size,
                        "dynamic_range": f.get("dynamic_range", "SDR"),
                    }

        stream_tiers = [res_map[k] for k in sorted(res_map.keys(), reverse=True) if k >= 360][:6]
        raw_chapters = info.get("chapters") or []
        chapters = [
            {
                "title": c.get("title", f"Chapter {i+1}"),
                "start_time": int(c.get("start_time", 0)),
                "end_time": int(c.get("end_time", 0)),
            }
            for i, c in enumerate(raw_chapters)
        ]

        return {
            "is_playlist": False,
            "id": info.get("id", ""),
            "title": info.get("title", "Untitled Stream"),
            "uploader": info.get("uploader") or info.get("channel") or "Unknown Source",
            "upload_date": info.get("upload_date", ""),
            "duration": info.get("duration", 0),
            "thumbnail": info.get("thumbnail", ""),
            "view_count": info.get("view_count", 0),
            "extractor": (info.get("extractor_key") or "Web").upper(),
            "chapters": chapters,
            "stream_tiers": stream_tiers,
            "has_subtitles": bool(info.get("subtitles") or info.get("automatic_captions")),
            "webpage_url": info.get("webpage_url", req.url),
        }
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


async def _dispatch_job(req: JobPayload, existing_job_id: Optional[str] = None) -> str:
    job_id = existing_job_id or str(uuid.uuid4())
    job_registry[job_id] = req
    cancelled_jobs.discard(job_id)
    main_loop = asyncio.get_running_loop()

    async def _worker():
        await ws_manager.push({
            "id": job_id,
            "title": req.title,
            "uploader": req.uploader,
            "mode": req.mode,
            "resolution": req.resolution,
            "thumbnail": req.thumbnail,
            "status": "starting",
            "percent": 0,
            "speed_mb": 0,
            "eta": 0,
            "size_mb": 0,
            "downloaded_mb": 0,
            "error": "",
        })

        last_emit = 0.0

        def _on_progress(d):
            nonlocal last_emit
            if job_id in cancelled_jobs:
                raise JobCancelledError("Cancelled by user")

            if d["status"] == "downloading":
                now = time.monotonic()
                if now - last_emit < 0.12:
                    return
                last_emit = now

                done = d.get("downloaded_bytes", 0)
                total = d.get("total_bytes") or d.get("total_bytes_estimate") or 0
                spd = d.get("speed") or 0
                eta = d.get("eta") or 0
                pct = round((done / total) * 100, 1) if total > 0 else 0.0

                asyncio.run_coroutine_threadsafe(
                    ws_manager.push({
                        "id": job_id,
                        "title": req.title,
                        "uploader": req.uploader,
                        "mode": req.mode,
                        "resolution": req.resolution,
                        "thumbnail": req.thumbnail,
                        "status": "downloading",
                        "percent": min(pct, 99.9),
                        "speed_mb": round(spd / (1024 * 1024), 2),
                        "eta": int(eta),
                        "size_mb": round(total / (1024 * 1024), 1) if total else 0,
                        "downloaded_mb": round(done / (1024 * 1024), 1),
                    }),
                    main_loop,
                )

            elif d["status"] == "finished":
                asyncio.run_coroutine_threadsafe(
                    ws_manager.push({
                        "id": job_id,
                        "title": req.title,
                        "uploader": req.uploader,
                        "mode": req.mode,
                        "resolution": req.resolution,
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
            base_dir = Path(app_config["download_dir"])
            if app_config.get("organizer_subfolder"):
                base_dir = base_dir / "%(uploader,channel|Unknown)s"

            safe_req_title = re.sub(r'[<>:"/\\|?*]', "_", (req.title or "stream")).strip()
            naming = app_config.get("naming_template", "standard")
            if req.url in resolved_stream_cache:
                out_template = str(base_dir / f"{safe_req_title}.%(ext)s")
            elif naming == "media_server":
                out_template = str(base_dir / "%(upload_date>%Y-%m-%d,release_date>%Y-%m-%d|Unknown)s - %(title)s [%(id)s].%(ext)s")
            elif naming == "channel_title":
                out_template = str(base_dir / "%(uploader,channel|Unknown)s - %(title)s [%(id)s].%(ext)s")
            elif naming == "id_only":
                out_template = str(base_dir / "%(id)s.%(ext)s")
            elif naming == "clean":
                out_template = str(base_dir / "%(title)s.%(ext)s")
            else:
                out_template = str(base_dir / "%(title)s [%(id)s].%(ext)s")

            pp_chain = []
            pref_codec = app_config.get("preferred_video_codec", "auto")
            pref_container = app_config.get("preferred_container", "mp4")
            pref_fps = app_config.get("preferred_fps", "any")

            if req.mode == "audio_flac":
                fmt = "bestaudio/best"
                pp_chain.append({
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "flac",
                    "preferredquality": "0",
                })
            elif req.mode == "audio_mp3":
                fmt = "bestaudio/best"
                pp_chain.append({
                    "key": "FFmpegExtractAudio",
                    "preferredcodec": "mp3",
                    "preferredquality": "320",
                })
            elif req.mode == "prores":
                fmt = "bestvideo+bestaudio/best"
                pp_chain.append({
                    "key": "FFmpegVideoConvertor",
                    "preferedformat": "mov",
                })
            else:
                h = req.resolution
                fps_filter = f"[fps<={pref_fps}]" if pref_fps in ("30", "60") else ""
                if pref_codec in ("avc1", "vp9", "av01"):
                    fmt = (
                        f"bestvideo[height<={h}]{fps_filter}[vcodec^={pref_codec}]+bestaudio/"
                        f"bestvideo[height<={h}]{fps_filter}+bestaudio/best[height<={h}]/best"
                    )
                else:
                    fmt = f"bestvideo[height<={h}]{fps_filter}+bestaudio/best[height<={h}]/best"

            if req.sponsorblock in ("remove", "mark"):
                cats = ["sponsor", "intro", "outro", "selfpromo", "interaction"]
                pp_chain.append({
                    "key": "SponsorBlock",
                    "categories": cats,
                    "when": "after_filter",
                })
                pp_chain.append({
                    "key": "ModifyChapters",
                    "remove_sponsor_segments": cats if req.sponsorblock == "remove" else [],
                    "force_keyframes": False,
                })

            if req.embed_metadata:
                pp_chain.append({"key": "FFmpegMetadata", "add_metadata": True})

            if req.embed_thumbnail and req.mode in ("video", "audio_flac", "audio_mp3"):
                pp_chain.append({"key": "EmbedThumbnail"})

            if req.write_subs:
                pp_chain.append({"key": "FFmpegEmbedSubtitle"})

            if req.split_chapters:
                pp_chain.append({"key": "FFmpegSplitChapters", "force_keyframes": False})

            threads = int(app_config.get("concurrent_fragments", 8)) if req.multithread else 1
            retries = int(app_config.get("network_retries", 5))

            ydl_opts = {
                "format": fmt,
                "outtmpl": out_template,
                "merge_output_format": pref_container if req.mode == "video" else None,
                "progress_hooks": [_on_progress],
                "concurrent_fragment_downloads": threads,
                "retries": retries,
                "fragment_retries": retries,
                "socket_timeout": int(app_config.get("socket_timeout", 30)),
                "restrictfilenames": bool(app_config.get("restrict_filenames", False)),
                "writeinfojson": bool(app_config.get("write_info_json", False)),
                "postprocessors": pp_chain,
                "writethumbnail": req.embed_thumbnail and req.mode in ("video", "audio_flac", "audio_mp3"),
                "writesubtitles": req.write_subs,
                "subtitleslangs": [app_config.get("sub_lang", "en")],
                "noplaylist": True,
                "quiet": True,
                "no_warnings": True,
            }
            _apply_impersonate_opts(ydl_opts)

            if app_config.get("force_ipv4"):
                ydl_opts["source_address"] = "0.0.0.0"

            if req.use_archive:
                ydl_opts["download_archive"] = str(ARCHIVE_FILE.resolve())

            if req.trim_enabled:
                start_sec = parse_timecode(req.trim_start) or 0
                end_sec = parse_timecode(req.trim_end)
                if end_sec and end_sec > start_sec:
                    ydl_opts["download_ranges"] = download_range_func(None, [(start_sec, end_sec)])
                    ydl_opts["force_keyframes_at_cuts"] = True

            rate_limit = app_config.get("speed_limit_mb", 0)
            if rate_limit and float(rate_limit) > 0:
                ydl_opts["ratelimit"] = int(float(rate_limit) * 1024 * 1024)

            if app_config.get("cookies_browser") not in (None, "none", ""):
                ydl_opts["cookiesfrombrowser"] = (app_config["cookies_browser"],)

            if app_config.get("proxy_url"):
                ydl_opts["proxy"] = app_config["proxy_url"]

            pp_args = {}
            if req.hw_accel and req.mode == "prores":
                pp_args["videoconvertor"] = ["-c:v", "prores_ks", "-profile:v", "3"]
            if req.normalize_audio:
                pp_args["ffmpeg"] = ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]
            if pp_args:
                ydl_opts["postprocessor_args"] = pp_args

            if req.url in resolved_stream_cache:
                resolved = resolved_stream_cache[req.url]
                ydl_opts.pop("cookiesfrombrowser", None)
                ydl_opts["http_headers"] = {
                    "User-Agent": resolved.get("user_agent", USER_AGENT),
                    "Referer": resolved["referer"],
                    "Origin": resolved["origin"],
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([resolved["stream_url"]])
                return

            try:
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([req.url])
            except Exception as first_dl_err:
                resolved = _resolve_cloudflare_stream(req.url)
                if not resolved:
                    raise first_dl_err
                ydl_opts.pop("cookiesfrombrowser", None)
                ydl_opts["outtmpl"] = str(base_dir / f"{safe_req_title}.%(ext)s")
                ydl_opts["http_headers"] = {
                    "User-Agent": resolved.get("user_agent", USER_AGENT),
                    "Referer": resolved["referer"],
                    "Origin": resolved["origin"],
                }
                with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                    ydl.download([resolved["stream_url"]])

        try:
            await asyncio.to_thread(_run_ydl)
            await ws_manager.push({
                "id": job_id,
                "title": req.title,
                "status": "completed",
                "percent": 100.0,
                "speed_mb": 0,
                "eta": 0,
            })
            if app_config.get("auto_open_folder"):
                try:
                    await open_output_dir(app_config["download_dir"])
                except Exception:
                    pass
        except JobCancelledError:
            cancelled_jobs.discard(job_id)
            await ws_manager.push({
                "id": job_id,
                "title": req.title,
                "status": "cancelled",
                "percent": 0,
                "speed_mb": 0,
                "eta": 0,
            })
        except Exception as err:
            await ws_manager.push({
                "id": job_id,
                "title": req.title,
                "status": "error",
                "error": str(err),
                "percent": 0,
                "speed_mb": 0,
                "eta": 0,
            })

    asyncio.create_task(_worker())
    return job_id


@app.post("/api/download")
async def queue_download(req: JobPayload):
    job_id = await _dispatch_job(req)
    return {"task_id": job_id, "status": "queued"}


@app.post("/api/download-batch")
async def queue_batch_download(batch: BatchJobPayload):
    ids = []
    for item in batch.items:
        jid = await _dispatch_job(item)
        ids.append(jid)
    return {"queued_count": len(ids), "task_ids": ids}


@app.post("/api/retry/{job_id}")
async def retry_job(job_id: str):
    if job_id not in job_registry:
        raise HTTPException(status_code=404, detail="Job configuration not found in session memory")
    saved_req = job_registry[job_id]
    await _dispatch_job(saved_req, existing_job_id=job_id)
    return {"retried": job_id}


@app.post("/api/cancel/{job_id}")
async def cancel_job(job_id: str):
    cancelled_jobs.add(job_id)
    return {"cancelled": job_id}


@app.get("/api/vault")
async def list_vault_files():
    dl_dir = Path(app_config["download_dir"])
    if not dl_dir.exists():
        return []

    video_exts = {".mp4", ".mkv", ".webm", ".mov"}
    audio_exts = {".flac", ".mp3", ".m4a", ".wav"}
    image_exts = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".bmp"}
    media_exts = video_exts | audio_exts | image_exts | {".srt"}

    items = []
    for p in dl_dir.rglob("*"):
        if p.is_file() and p.suffix.lower() in media_exts and not p.name.endswith(".part"):
            stat = p.stat()
            sfx = p.suffix.lower()
            category = (
                "video" if sfx in video_exts else
                "audio" if sfx in audio_exts else
                "image" if sfx in image_exts else "other"
            )
            items.append({
                "name": p.name,
                "path": str(p.resolve()),
                "rel_path": str(p.relative_to(dl_dir)),
                "ext": p.suffix.lstrip(".").upper(),
                "category": category,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d %H:%M"),
                "timestamp": stat.st_mtime,
            })

    items.sort(key=lambda x: x["timestamp"], reverse=True)
    return items[:300]


@app.delete("/api/vault")
async def delete_vault_file(path: str):
    target = Path(path)
    dl_dir = Path(app_config["download_dir"]).resolve()
    if not str(target.resolve()).startswith(str(dl_dir)):
        raise HTTPException(status_code=403, detail="Access denied outside vault directory")
    if target.exists() and target.is_file():
        target.unlink()
        return {"deleted": path}
    raise HTTPException(status_code=404, detail="File not found")


@app.post("/api/open-folder")
async def open_output_dir(path: Optional[str] = None):
    target = Path(path) if path else Path(app_config["download_dir"])
    if target.is_file():
        if sys.platform == "win32":
            subprocess.Popen(["explorer", "/select,", str(target.resolve())])
            return {"opened": str(target)}
        target = target.parent

    resolved = str(target.resolve())
    if sys.platform == "win32":
        os.startfile(resolved)
    elif sys.platform == "darwin":
        subprocess.Popen(["open", resolved])
    else:
        subprocess.Popen(["xdg-open", resolved])
    return {"opened": resolved}


@app.get("/api/images/proxy")
async def proxy_image_thumbnail(url: str):
    """Proxies remote gallery thumbnails with valid Referer headers to prevent hotlink 403s."""
    def _fetch_bytes():
        parsed = urlparse(url)
        origin_ref = f"{parsed.scheme}://{parsed.netloc}/" if parsed.scheme and parsed.netloc else url
        headers = {"Referer": origin_ref}
        if HAS_CURL_CFFI and cffi_requests is not None:
            r = cffi_requests.get(url, impersonate="chrome", headers=headers, timeout=15)
            r.raise_for_status()
            return r.content, r.headers.get("Content-Type", "image/jpeg")
        r = requests.get(url, headers={"User-Agent": USER_AGENT, **headers}, timeout=15)
        r.raise_for_status()
        return r.content, r.headers.get("Content-Type", "image/jpeg")

    try:
        data, content_type = await asyncio.to_thread(_fetch_bytes)
        return Response(
            content=data,
            media_type=content_type,
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


def _parse_gallery_dl_output(raw_stdout: str) -> tuple[str, List[dict]]:
    """Parses gallery-dl --dump-json output whether formatted as a multi-line JSON array or NDJSON."""
    links: List[dict] = []
    gallery_title = "Image Gallery"
    raw_out = (raw_stdout or "").strip()
    if not raw_out:
        return gallery_title, links

    events = []
    try:
        events = json.loads(raw_out)
    except Exception:
        start_idx = raw_out.find("[")
        end_idx = raw_out.rfind("]")
        if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
            try:
                events = json.loads(raw_out[start_idx : end_idx + 1])
            except Exception:
                pass
        if not events:
            for line in raw_out.splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    events.append(json.loads(line))
                except Exception:
                    continue

    seen_urls = set()
    for data in events:
        if isinstance(data, list) and len(data) >= 2:
            event_type = data[0]
            if event_type == 2 and isinstance(data[1], dict):
                gallery_title = (
                    data[1].get("title")
                    or data[1].get("gallery")
                    or data[1].get("category")
                    or gallery_title
                )
            elif event_type == 3:
                if isinstance(data[1], str):
                    img_url = data[1]
                    meta = data[2] if len(data) > 2 and isinstance(data[2], dict) else {}
                elif isinstance(data[1], dict):
                    meta = data[1]
                    img_url = meta.get("url") or meta.get("file")
                else:
                    continue

                if img_url and img_url not in seen_urls:
                    seen_urls.add(img_url)
                    ext = (meta.get("extension") or "jpg").lower()
                    fname = meta.get("filename") or meta.get("num") or f"image_{len(links) + 1:03d}"
                    title_str = f"{fname}.{ext}" if not str(fname).lower().endswith(f".{ext}") else str(fname)
                    thumb_url = meta.get("thumbnail") or meta.get("thumb") or img_url
                    links.append({
                        "url": img_url,
                        "thumb": thumb_url,
                        "title": title_str,
                        "ext": ext.upper(),
                        "width": meta.get("width"),
                        "height": meta.get("height"),
                    })
                    if gallery_title == "Image Gallery":
                        gallery_title = (
                            meta.get("title")
                            or meta.get("gallery")
                            or meta.get("category")
                            or gallery_title
                        )

    return gallery_title, links


def _scrape_html_images_fallback(page_url: str) -> tuple[str, List[dict]]:
    """Fallback HTML image extractor for general websites not supported by gallery-dl."""
    raw_html = _http_get_text(page_url, is_navigation=True)

    title_match = re.search(r"<title[^>]*>(.*?)</title>", raw_html, re.IGNORECASE | re.DOTALL)
    page_title = html.unescape(title_match.group(1).strip()) if title_match else "Web Image Gallery"

    candidates: List[str] = []

    for m in re.finditer(r'<a[^>]+href=["\']([^"\']+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^"\']*)?)["\']', raw_html, re.IGNORECASE):
        candidates.append(m.group(1))

    for img_tag in re.findall(r"<img[^>]+>", raw_html, re.IGNORECASE):
        srcset = re.search(r'srcset=["\']([^"\']+)["\']', img_tag, re.IGNORECASE)
        if srcset:
            parts = [p.strip().split(" ")[0] for p in srcset.group(1).split(",") if p.strip()]
            if parts:
                candidates.append(parts[-1])
        for attr in ("data-src", "data-original", "data-lazy-src", "src"):
            m = re.search(rf'{attr}=["\']([^"\']+)["\']', img_tag, re.IGNORECASE)
            if m:
                candidates.append(m.group(1))
                break

    seen = set()
    images = []
    skip_keywords = ("sprite", "logo", "icon", "avatar", "pixel", "1x1", "blank", "tracking", ".svg")

    for raw in candidates:
        if raw.startswith("data:"):
            continue
        full_url = urljoin(page_url, raw.strip())
        lower_url = full_url.lower()
        if any(k in lower_url for k in skip_keywords):
            continue
        if full_url not in seen:
            seen.add(full_url)
            path_part = unquote(urlparse(full_url).path)
            fname = Path(path_part).name or f"image_{len(images) + 1:03d}.jpg"
            ext = Path(fname).suffix.lstrip(".").upper() or "JPG"
            images.append({
                "url": full_url,
                "thumb": full_url,
                "title": fname,
                "ext": ext,
                "width": None,
                "height": None,
            })

    return page_title, images


@app.post("/api/images/analyze")
async def analyze_image_gallery(req: ImageGalleryProbe):
    """Harvests full-resolution image links using gallery-dl with an automatic HTML scraper fallback."""
    def _extract_links():
        parsed = urlparse(req.url.strip())
        clean_url = urlunparse((parsed.scheme, parsed.netloc, parsed.path, parsed.params, parsed.query, ""))
        gdl_bin = resolve_gallery_dl_bin()

        def _run_gdl(use_cookies: bool):
            cmd = [gdl_bin, "--dump-json", "--user-agent", USER_AGENT]
            if use_cookies:
                browser = app_config.get("cookies_browser", "none")
                if browser and browser != "none":
                    cmd.extend(["--cookies-from-browser", browser])
            if app_config.get("proxy_url"):
                cmd.extend(["--proxy", app_config["proxy_url"]])
            cmd.append(clean_url)
            return subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=45)

        browser_cfg = app_config.get("cookies_browser", "none")
        has_cookies = bool(browser_cfg and browser_cfg != "none")

        try:
            res = _run_gdl(use_cookies=has_cookies)
            title, links = _parse_gallery_dl_output(res.stdout)
            if not links and has_cookies:
                res = _run_gdl(use_cookies=False)
                title, links = _parse_gallery_dl_output(res.stdout)
        except Exception:
            title, links = "Image Gallery", []

        if not links:
            try:
                title, links = _scrape_html_images_fallback(clean_url)
            except Exception:
                pass

        return {"title": title, "images": links, "source_url": clean_url}

    try:
        result = await asyncio.to_thread(_extract_links)
        if not result["images"]:
            raise HTTPException(status_code=400, detail="No direct images found or site protected.")
        return result
    except HTTPException:
        raise
    except Exception as err:
        raise HTTPException(status_code=400, detail=str(err))


@app.post("/api/images/download")
async def download_selected_images(req: ImageBatchDownload):
    """Downloads an array of chosen image URLs in parallel to the Vault folder with live WebSocket telemetry."""
    job_id = str(uuid.uuid4())
    cancelled_jobs.discard(job_id)

    async def _worker():
        base_vault = Path(app_config["download_dir"]) / "Image Vault"
        if app_config.get("image_subfolder_per_gallery", True) and req.folder_name:
            folder_clean = re.sub(r'[<>:"/\\|?*]', "_", req.folder_name).strip() or "Gallery"
            base_dir = base_vault / folder_clean
        else:
            base_dir = base_vault

        base_dir.mkdir(parents=True, exist_ok=True)

        total = len(req.image_urls)
        thumb = req.image_urls[0] if req.image_urls else ""
        concurrency = max(1, min(int(app_config.get("image_concurrency", 4)), 8))
        naming_scheme = app_config.get("image_naming_scheme", "indexed_original")
        sem = asyncio.Semaphore(concurrency)

        await ws_manager.push({
            "id": job_id,
            "title": f"{req.folder_name or 'Image Gallery'} ({total} images)",
            "uploader": "Image Scraper",
            "mode": "images",
            "resolution": f"{concurrency}x",
            "thumbnail": thumb,
            "status": "starting",
            "percent": 0.0,
            "speed_mb": 0.0,
            "eta": total,
            "size_mb": 0.0,
            "downloaded_mb": 0.0,
            "error": "",
        })

        def _download_single(idx: int, img_url: str) -> int:
            parsed = urlparse(img_url)
            origin_referer = f"{parsed.scheme}://{parsed.netloc}/" if parsed.scheme and parsed.netloc else img_url
            headers = {"Referer": origin_referer}

            raw_name = Path(unquote(parsed.path)).name
            safe_name = re.sub(r'[<>:"/\\|?*]', "_", raw_name).strip()
            ext = Path(safe_name).suffix if "." in safe_name else ".jpg"

            if naming_scheme == "sequential":
                final_name = f"image_{idx + 1:03d}{ext}"
            elif naming_scheme == "original" and safe_name and "." in safe_name:
                final_name = safe_name
            else:
                final_name = f"{idx + 1:03d}_{safe_name}" if (safe_name and "." in safe_name) else f"image_{idx + 1:03d}.jpg"

            dest_path = base_dir / final_name

            if HAS_CURL_CFFI and cffi_requests is not None:
                resp = cffi_requests.get(img_url, impersonate="chrome", headers=headers, timeout=30)
                resp.raise_for_status()
                data = resp.content
                with open(dest_path, "wb") as f:
                    f.write(data)
                return len(data)

            with requests.get(img_url, headers={"User-Agent": USER_AGENT, **headers}, stream=True, timeout=30) as r:
                r.raise_for_status()
                written = 0
                with open(dest_path, "wb") as f:
                    for chunk in r.iter_content(chunk_size=65536):
                        if chunk:
                            f.write(chunk)
                            written += len(chunk)
                return written

        completed_count = 0
        downloaded_bytes_total = 0
        start_time = time.monotonic()

        async def _Download_Task(idx: int, img_url: str):
            nonlocal completed_count, downloaded_bytes_total
            async with sem:
                if job_id in cancelled_jobs:
                    return
                try:
                    bytes_written = await asyncio.to_thread(_download_single, idx, img_url)
                    downloaded_bytes_total += bytes_written
                except Exception:
                    gdl_bin = resolve_gallery_dl_bin()
                    await asyncio.to_thread(
                        subprocess.run,
                        [gdl_bin, "-D", str(base_dir), img_url],
                        capture_output=True,
                    )
                completed_count += 1
                elapsed = max(time.monotonic() - start_time, 0.1)
                speed_mb = round((downloaded_bytes_total / (1024 * 1024)) / elapsed, 2)
                done_mb = round(downloaded_bytes_total / (1024 * 1024), 2)
                pct = round((completed_count / total) * 100, 1)

                await ws_manager.push({
                    "id": job_id,
                    "title": f"{req.folder_name or 'Image Gallery'} ({completed_count}/{total})",
                    "uploader": "Image Scraper",
                    "mode": "images",
                    "resolution": f"{concurrency}x",
                    "thumbnail": thumb,
                    "status": "downloading",
                    "percent": min(pct, 99.9),
                    "speed_mb": speed_mb,
                    "eta": max(int((total - completed_count) / max(concurrency, 1)), 0),
                    "size_mb": done_mb,
                    "downloaded_mb": done_mb,
                })

        try:
            await asyncio.gather(*[_Download_Task(i, u) for i, u in enumerate(req.image_urls)])

            if job_id in cancelled_jobs:
                cancelled_jobs.discard(job_id)
                await ws_manager.push({
                    "id": job_id,
                    "title": f"{req.folder_name or 'Image Gallery'} (Cancelled)",
                    "status": "cancelled",
                    "percent": 0,
                    "speed_mb": 0,
                    "eta": 0,
                })
                return

            total_mb = round(downloaded_bytes_total / (1024 * 1024), 2)
            await ws_manager.push({
                "id": job_id,
                "title": f"{req.folder_name or 'Image Gallery'} ({total} images)",
                "uploader": "Image Scraper",
                "mode": "images",
                "resolution": "FULL",
                "thumbnail": thumb,
                "status": "completed",
                "percent": 100.0,
                "speed_mb": 0,
                "eta": 0,
                "size_mb": total_mb,
                "downloaded_mb": total_mb,
            })
            if app_config.get("auto_open_folder"):
                try:
                    await open_output_dir(str(base_dir))
                except Exception:
                    pass
        except Exception as err:
            await ws_manager.push({
                "id": job_id,
                "title": "Image Gallery Download Error",
                "status": "error",
                "error": str(err),
                "percent": 0,
                "speed_mb": 0,
                "eta": 0,
            })

    asyncio.create_task(_worker())
    return {"task_id": job_id, "status": "queued"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="warning")
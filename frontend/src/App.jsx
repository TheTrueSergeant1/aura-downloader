import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Terminal,
    Layers,
    Database,
    Sliders,
    Image as ImageIcon,
    Download,
    FolderOpen,
    Trash2,
    Check,
    XCircle,
    AlertCircle,
    Loader2,
    RefreshCw,
    Clipboard,
    Scissors,
    Sparkles,
    HardDrive,
    ChevronLeft,
    ChevronRight,
    Search,
    Maximize2,
    Grid,
    LayoutGrid,
    CheckCircle2,
    Shield,
    Cpu,
    Volume2,
    VolumeX,
    Film,
    Music,
    RotateCcw,
    Split,
    Zap,
    Globe,
    Subtitles,
    CheckSquare,
    Square,
    Palette,
    Activity,
    Bell,
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';
const WS_URL = 'ws://127.0.0.1:8000/ws';

const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 32 };

// 8 Curated Professional Studio Themes (Selectable exclusively inside Preferences -> Appearance)
const THEME_STYLES = {
    dark: {
        name: 'Obsidian Dark',
        desc: 'Balanced neutral carbon surface for mastering',
        bg: 'bg-[#09090b]',
        panel: 'bg-[#111115]',
        card: 'bg-[#16161c]',
        border: 'border-zinc-800/80',
        text: 'text-zinc-100',
        subtext: 'text-zinc-400',
        swatches: ['#09090b', '#111115', '#27272a', '#f4f4f5'],
    },
    oled: {
        name: 'OLED Pitch Black',
        desc: 'Zero-nit true black for HDR & darkroom suites',
        bg: 'bg-black',
        panel: 'bg-[#070709]',
        card: 'bg-[#0d0d12]',
        border: 'border-zinc-900',
        text: 'text-zinc-100',
        subtext: 'text-zinc-500',
        swatches: ['#000000', '#070709', '#18181b', '#ffffff'],
    },
    nord: {
        name: 'Broadcast Slate',
        desc: 'Cool arctic slate inspired by broadcast consoles',
        bg: 'bg-[#0d1219]',
        panel: 'bg-[#131a24]',
        card: 'bg-[#192230]',
        border: 'border-slate-800/90',
        text: 'text-slate-100',
        subtext: 'text-slate-400',
        swatches: ['#0d1219', '#131a24', '#334155', '#38bdf8'],
    },
    tokyo: {
        name: 'Tokyo Night',
        desc: 'Deep indigo midnight with cybernetic contrast',
        bg: 'bg-[#0f0f17]',
        panel: 'bg-[#161622]',
        card: 'bg-[#1c1d2c]',
        border: 'border-indigo-950/90',
        text: 'text-indigo-50',
        subtext: 'text-indigo-300/60',
        swatches: ['#0f0f17', '#161622', '#312e81', '#818cf8'],
    },
    catppuccin: {
        name: 'Catppuccin Mocha',
        desc: 'Warm espresso dark with soft pastel ergonomics',
        bg: 'bg-[#11111b]',
        panel: 'bg-[#181825]',
        card: 'bg-[#1e1e2e]',
        border: 'border-zinc-800/90',
        text: 'text-zinc-100',
        subtext: 'text-zinc-400',
        swatches: ['#11111b', '#181825', '#313244', '#cba6f7'],
    },
    dracula: {
        name: 'Dracula Studio',
        desc: 'High-contrast gothic plum for late-night sessions',
        bg: 'bg-[#0d0b12]',
        panel: 'bg-[#15121e]',
        card: 'bg-[#1d192b]',
        border: 'border-purple-950/80',
        text: 'text-purple-50',
        subtext: 'text-purple-300/60',
        swatches: ['#0d0b12', '#15121e', '#3b0764', '#c084fc'],
    },
    emerald: {
        name: 'Matrix Terminal',
        desc: 'Tactical phosphor dark with deep forest panels',
        bg: 'bg-[#060c09]',
        panel: 'bg-[#0b1510]',
        card: 'bg-[#101f17]',
        border: 'border-emerald-950/90',
        text: 'text-emerald-50',
        subtext: 'text-emerald-400/60',
        swatches: ['#060c09', '#0b1510', '#064e3b', '#34d399'],
    },
    light: {
        name: 'Daylight Studio',
        desc: 'Crisp alabaster paper finish for bright rooms',
        bg: 'bg-zinc-100',
        panel: 'bg-white',
        card: 'bg-zinc-50',
        border: 'border-zinc-300',
        text: 'text-zinc-900',
        subtext: 'text-zinc-500',
        swatches: ['#f4f4f5', '#ffffff', '#e4e4e7', '#18181b'],
    },
};

// 6 Customizable Interactive Accent Color Profiles
const ACCENT_PALETTES = {
    white: {
        label: 'Studio Mono',
        swatch: '#ffffff',
        btn: 'bg-zinc-100 text-zinc-950 hover:bg-white',
        bar: 'bg-zinc-100',
        ring: 'border-zinc-200 ring-zinc-200/30',
        pill: 'bg-zinc-100',
    },
    emerald: {
        label: 'Signal Emerald',
        swatch: '#10b981',
        btn: 'bg-emerald-400 text-zinc-950 hover:bg-emerald-300',
        bar: 'bg-emerald-400',
        ring: 'border-emerald-400 ring-emerald-400/30',
        pill: 'bg-emerald-400',
    },
    sky: {
        label: 'Broadcast Cyan',
        swatch: '#38bdf8',
        btn: 'bg-sky-400 text-slate-950 hover:bg-sky-300',
        bar: 'bg-sky-400',
        ring: 'border-sky-400 ring-sky-400/30',
        pill: 'bg-sky-400',
    },
    violet: {
        label: 'Electric Violet',
        swatch: '#a78bfa',
        btn: 'bg-violet-400 text-zinc-950 hover:bg-violet-300',
        bar: 'bg-violet-400',
        ring: 'border-violet-400 ring-violet-400/30',
        pill: 'bg-violet-400',
    },
    amber: {
        label: 'Cinema Amber',
        swatch: '#fbbf24',
        btn: 'bg-amber-400 text-zinc-950 hover:bg-amber-300',
        bar: 'bg-amber-400',
        ring: 'border-amber-400 ring-amber-400/30',
        pill: 'bg-amber-400',
    },
    rose: {
        label: 'Crimson Master',
        swatch: '#fb7185',
        btn: 'bg-rose-400 text-zinc-950 hover:bg-rose-300',
        bar: 'bg-rose-400',
        ring: 'border-rose-400 ring-rose-400/30',
        pill: 'bg-rose-400',
    },
};

// Web Audio API Synthesizer with customizable sound profiles & volume
function playStudioSfx(type = 'complete', enabled = true, style = 'chime', volumePct = 70) {
    if (!enabled) return;
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        const ctx = new AudioCtx();
        const now = ctx.currentTime;
        const peakGain = Math.max(0.005, Math.min(0.2, (Number(volumePct) || 70) / 1000));

        if (style === 'minimal') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(type === 'error' ? 240 : 880, now);
            gain.gain.setValueAtTime(peakGain, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.07);
            return;
        }

        const wave = style === 'synth' ? 'triangle' : 'sine';

        if (type === 'complete') {
            const freqs = style === 'synth' ? [440, 554.37, 659.25, 880] : [523.25, 659.25, 783.99, 1046.5];
            freqs.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = wave;
                osc.frequency.setValueAtTime(f, now + idx * 0.06);
                gain.gain.setValueAtTime(peakGain, now + idx * 0.06);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.06 + 0.35);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.06);
                osc.stop(now + idx * 0.06 + 0.36);
            });
        } else if (type === 'error') {
            const freqs = [220, 164.81];
            freqs.forEach((f, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(f, now + idx * 0.1);
                gain.gain.setValueAtTime(peakGain, now + idx * 0.1);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.25);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now + idx * 0.1);
                osc.stop(now + idx * 0.1 + 0.26);
            });
        } else if (type === 'queue') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = wave;
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
            gain.gain.setValueAtTime(peakGain, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.13);
        }
    } catch {
        // Ignore audio context restrictions
    }
}

// Reusable Sleek Pill Toggle Switch for Preferences
function SettingToggle({ title, description, checked, onChange, accentPill = 'bg-zinc-100' }) {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/50 hover:bg-zinc-900/80 border border-zinc-800/80 cursor-pointer transition"
        >
            <div className="space-y-0.5 pr-2">
                <p className="text-xs font-medium text-zinc-100">{title}</p>
                {description && <p className="text-[11px] text-zinc-400 leading-relaxed">{description}</p>}
            </div>
            <div
                className={`w-10 h-5.5 flex items-center rounded-full p-0.5 transition-colors duration-200 shrink-0 ${checked ? accentPill : 'bg-zinc-800 border border-zinc-700'
                    }`}
            >
                <div
                    className={`w-4 h-4 rounded-full transition-transform duration-200 ${checked ? 'translate-x-4.5 bg-zinc-950 shadow' : 'translate-x-0 bg-zinc-400'
                        }`}
                />
            </div>
        </div>
    );
}

function formatDuration(sec) {
    if (!sec || sec <= 0) return 'LIVE / VOD';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${m}:${String(s).padStart(2, '0')}`;
}

function formatSecondsToTC(sec) {
    const sTotal = Math.max(0, Math.floor(sec || 0));
    const h = Math.floor(sTotal / 3600);
    const m = Math.floor((sTotal % 3600) / 60);
    const s = sTotal % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatEta(sec) {
    if (!sec || sec <= 0) return '0s';
    if (sec < 60) return `${Math.ceil(sec)}s`;
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}m ${s}s`;
}

function formatUploadDate(raw) {
    if (!raw || raw.length !== 8) return '';
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

export default function App() {
    const [activeTab, setActiveTab] = useState('capture');
    const [settingsSubTab, setSettingsSubTab] = useState('appearance'); // appearance | storage | mastering | scraper | network | system

    // System & Settings State
    const [sysInfo, setSysInfo] = useState({
        yt_dlp_version: '...',
        ffmpeg_available: true,
        ffmpeg_path: '',
        gallery_dl_available: true,
        curl_cffi_available: true,
        disk_free_gb: 0,
        disk_total_gb: 0,
        download_dir: '',
        archive_count: 0,
    });

    const [settings, setSettings] = useState({
        theme: 'dark',
        accent_color: 'white',
        ui_density: 'comfortable',
        reduce_motion: false,
        show_header_telemetry: true,
        auto_paste_probe: true,
        audio_sfx: true,
        sfx_style: 'chime',
        sfx_volume: 70,
        download_dir: '',
        naming_template: 'standard',
        restrict_filenames: false,
        organizer_subfolder: false,
        write_info_json: false,
        auto_open_folder: false,
        use_archive: false,
        default_export_mode: 'video',
        default_resolution: '2160',
        preferred_fps: 'any',
        preferred_video_codec: 'auto',
        preferred_container: 'mp4',
        default_sponsorblock: 'none',
        embed_metadata: true,
        embed_thumbnail: true,
        write_subs: false,
        sub_lang: 'en',
        normalize_audio: false,
        hw_accel: true,
        image_page_size: 24,
        image_concurrency: 4,
        image_naming_scheme: 'indexed_original',
        image_subfolder_per_gallery: true,
        image_auto_proxy: true,
        concurrent_fragments: 8,
        network_retries: 5,
        socket_timeout: 30,
        speed_limit_mb: 0,
        cookies_browser: 'none',
        proxy_url: '',
        force_ipv4: false,
    });
    const [settingsSavedToast, setSettingsSavedToast] = useState(false);
    const sfxConfigRef = useRef({ enabled: true, style: 'chime', volume: 70 });

    useEffect(() => {
        sfxConfigRef.current = {
            enabled: Boolean(settings.audio_sfx),
            style: settings.sfx_style || 'chime',
            volume: Number(settings.sfx_volume) || 70,
        };
    }, [settings.audio_sfx, settings.sfx_style, settings.sfx_volume]);

    // Stream Ingest State
    const [inputUrl, setInputUrl] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzeError, setAnalyzeError] = useState('');
    const [streamMeta, setStreamMeta] = useState(null);
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
    const [playlistFilter, setPlaylistFilter] = useState('');

    // Export Job Options
    const [exportMode, setExportMode] = useState('video');
    const [resolution, setResolution] = useState('2160');
    const [multithread, setMultithread] = useState(true);
    const [splitChapters, setSplitChapters] = useState(false);
    const [sponsorblock, setSponsorblock] = useState('none');
    const [normalizeAudio, setNormalizeAudio] = useState(false);
    const [writeSubs, setWriteSubs] = useState(false);
    const [useArchive, setUseArchive] = useState(false);
    const [trimEnabled, setTrimEnabled] = useState(false);
    const [trimStart, setTrimStart] = useState('');
    const [trimEnd, setTrimEnd] = useState('');

    // Transfer Queue & Vault State
    const [queueMap, setQueueMap] = useState({});
    const [queueFilter, setQueueFilter] = useState('all');
    const [vaultFiles, setVaultFiles] = useState([]);
    const [vaultCategory, setVaultCategory] = useState('all');
    const [vaultSearch, setVaultSearch] = useState('');
    const [vaultSort, setVaultSort] = useState('newest');

    // Image Scraper & Pagination State
    const [imageInputUrl, setImageInputUrl] = useState('');
    const [isAnalyzingImages, setIsAnalyzingImages] = useState(false);
    const [galleryData, setGalleryData] = useState(null);
    const [galleryFolderName, setGalleryFolderName] = useState('');
    const [selectedImageUrls, setSelectedImageUrls] = useState([]);
    const [imageError, setImageError] = useState('');
    const [imagePage, setImagePage] = useState(1);
    const [imagePageSize, setImagePageSize] = useState(24);
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [compactImageGrid, setCompactImageGrid] = useState(false);
    const [useProxyThumbnails, setUseProxyThumbnails] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(null);

    const activeTheme = THEME_STYLES[settings.theme] || THEME_STYLES.dark;
    const activeAccent = ACCENT_PALETTES[settings.accent_color] || ACCENT_PALETTES.white;
    const workspacePadding =
        settings.ui_density === 'compact' ? 'p-4' : settings.ui_density === 'spacious' ? 'p-8' : 'p-6';

    const fetchSystemAndSettings = useCallback(async () => {
        try {
            const [sysRes, cfgRes] = await Promise.all([
                fetch(`${API_BASE}/api/system`),
                fetch(`${API_BASE}/api/settings`),
            ]);
            const sysJson = sysRes.ok ? await sysRes.json() : null;
            if (sysJson) setSysInfo(sysJson);

            if (cfgRes.ok) {
                const cfg = await cfgRes.json();
                setSettings((prev) => ({
                    ...prev,
                    ...cfg,
                    download_dir: cfg.download_dir || sysJson?.download_dir || prev.download_dir,
                }));
                setExportMode(cfg.default_export_mode || 'video');
                setResolution(String(cfg.default_resolution || '2160'));
                setSponsorblock(cfg.default_sponsorblock || 'none');
                setNormalizeAudio(Boolean(cfg.normalize_audio));
                setWriteSubs(Boolean(cfg.write_subs));
                setUseArchive(Boolean(cfg.use_archive));
                setImagePageSize(Number(cfg.image_page_size) || 24);
            }
        } catch {
            // Backend still booting
        }
    }, []);

    const fetchVault = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE}/api/vault`);
            if (res.ok) setVaultFiles(await res.json());
        } catch {
            // Ignore error
        }
    }, []);

    useEffect(() => {
        fetchSystemAndSettings();
        fetchVault();
    }, [fetchSystemAndSettings, fetchVault]);

    // Persistent WebSocket telemetry connection
    useEffect(() => {
        let ws;
        let reconnectTimer;
        const connectWs = () => {
            ws = new WebSocket(WS_URL);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data && data.id) {
                        setQueueMap((prev) => {
                            const prevStatus = prev[data.id]?.status;
                            const sfx = sfxConfigRef.current;
                            if (data.status === 'completed' && prevStatus !== 'completed') {
                                playStudioSfx('complete', sfx.enabled, sfx.style, sfx.volume);
                                fetchVault();
                                fetchSystemAndSettings();
                            } else if (data.status === 'error' && prevStatus !== 'error') {
                                playStudioSfx('error', sfx.enabled, sfx.style, sfx.volume);
                            }
                            return { ...prev, [data.id]: { ...(prev[data.id] || {}), ...data } };
                        });
                    }
                } catch {
                    // Ignore malformed telemetry
                }
            };
            ws.onclose = () => {
                reconnectTimer = setTimeout(connectWs, 2000);
            };
        };
        connectWs();
        return () => {
            clearTimeout(reconnectTimer);
            if (ws) ws.close();
        };
    }, [fetchVault, fetchSystemAndSettings]);

    // Filtered & Paginated Gallery Images
    const filteredGalleryImages = useMemo(() => {
        if (!galleryData?.images) return [];
        const q = imageSearchQuery.trim().toLowerCase();
        if (!q) return galleryData.images;
        return galleryData.images.filter((img) => (img.title || '').toLowerCase().includes(q));
    }, [galleryData, imageSearchQuery]);

    const totalImagePages = Math.max(1, Math.ceil(filteredGalleryImages.length / imagePageSize));
    const safeImagePage = Math.min(imagePage, totalImagePages);

    const paginatedGalleryImages = useMemo(() => {
        const start = (safeImagePage - 1) * imagePageSize;
        return filteredGalleryImages.slice(start, start + imagePageSize);
    }, [filteredGalleryImages, safeImagePage, imagePageSize]);

    const selectedSet = useMemo(() => new Set(selectedImageUrls), [selectedImageUrls]);

    // Lightbox Keyboard Navigation
    useEffect(() => {
        if (lightboxIndex === null) return;
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setLightboxIndex(null);
            } else if (e.key === 'ArrowRight') {
                setLightboxIndex((prev) => (prev + 1 < filteredGalleryImages.length ? prev + 1 : 0));
            } else if (e.key === 'ArrowLeft') {
                setLightboxIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredGalleryImages.length - 1));
            } else if (e.key === ' ') {
                e.preventDefault();
                const currentImg = filteredGalleryImages[lightboxIndex];
                if (currentImg) {
                    setSelectedImageUrls((prev) =>
                        prev.includes(currentImg.url) ? prev.filter((u) => u !== currentImg.url) : [...prev, currentImg.url]
                    );
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [lightboxIndex, filteredGalleryImages]);

    // Global Ctrl+V shortcut in Ingest Studio or Image Scraper
    useEffect(() => {
        const handlePaste = (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
            const pasted = e.clipboardData?.getData('text')?.trim();
            if (!pasted || !pasted.startsWith('http')) return;
            if (activeTab === 'capture') {
                setInputUrl(pasted);
                if (settings.auto_paste_probe) handleAnalyzeStream(pasted);
            } else if (activeTab === 'images') {
                setImageInputUrl(pasted);
                if (settings.auto_paste_probe) handleScanGallery(pasted);
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    });

    // Analyze video/playlist URL
    const handleAnalyzeStream = async (overrideUrl) => {
        const target = (overrideUrl ?? inputUrl).trim();
        if (!target) return;
        setAnalyzeError('');
        setIsAnalyzing(true);
        setStreamMeta(null);
        setTrimEnabled(false);
        setTrimStart('');
        setTrimEnd('');
        setSplitChapters(false);
        setPlaylistFilter('');

        try {
            const res = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: target }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to inspect stream');
            }
            const data = await res.json();
            setStreamMeta(data);
            if (data.is_playlist && data.entries) {
                setSelectedPlaylistIds(data.entries.map((e) => e.id));
            } else if (data.stream_tiers?.length > 0) {
                const defaultRes = String(settings.default_resolution || '2160');
                const available = data.stream_tiers.map((t) => String(t.height));
                setResolution(available.includes(defaultRes) ? defaultRes : available[0]);
            }
        } catch (err) {
            setAnalyzeError(err.message);
            playStudioSfx('error', settings.audio_sfx, settings.sfx_style, settings.sfx_volume);
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Dispatch single or playlist download
    const handleDispatchDownload = async () => {
        if (!streamMeta) return;
        try {
            if (streamMeta.is_playlist) {
                const chosen = (streamMeta.entries || []).filter((e) => selectedPlaylistIds.includes(e.id));
                if (chosen.length === 0) return;
                const items = chosen.map((item) => ({
                    url: item.url,
                    title: item.title,
                    uploader: item.uploader,
                    thumbnail: item.thumbnail,
                    mode: exportMode,
                    resolution,
                    multithread,
                    split_chapters: false,
                    hw_accel: settings.hw_accel,
                    embed_metadata: settings.embed_metadata,
                    embed_thumbnail: settings.embed_thumbnail,
                    write_subs: writeSubs,
                    normalize_audio: normalizeAudio,
                    use_archive: useArchive,
                    sponsorblock,
                    trim_enabled: false,
                }));
                await fetch(`${API_BASE}/api/download-batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items }),
                });
            } else {
                await fetch(`${API_BASE}/api/download`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: streamMeta.webpage_url || inputUrl.trim(),
                        title: streamMeta.title,
                        uploader: streamMeta.uploader,
                        thumbnail: streamMeta.thumbnail,
                        mode: exportMode,
                        resolution,
                        multithread,
                        split_chapters: splitChapters,
                        hw_accel: settings.hw_accel,
                        embed_metadata: settings.embed_metadata,
                        embed_thumbnail: settings.embed_thumbnail,
                        write_subs: writeSubs,
                        normalize_audio: normalizeAudio,
                        use_archive: useArchive,
                        sponsorblock,
                        trim_enabled: trimEnabled,
                        trim_start: trimStart,
                        trim_end: trimEnd,
                    }),
                });
            }
            playStudioSfx('queue', settings.audio_sfx, settings.sfx_style, settings.sfx_volume);
            setActiveTab('queue');
        } catch {
            setAnalyzeError('Failed to dispatch extraction job.');
        }
    };

    // Scan image gallery
    const handleScanGallery = async (overrideUrl) => {
        const target = (overrideUrl ?? imageInputUrl).trim();
        if (!target) return;
        setImageError('');
        setIsAnalyzingImages(true);
        setGalleryData(null);
        setImagePage(1);
        setImageSearchQuery('');
        setLightboxIndex(null);

        try {
            const res = await fetch(`${API_BASE}/api/images/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: target }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to harvest image gallery');
            }
            const data = await res.json();
            setGalleryData(data);
            setGalleryFolderName(data.title || 'Image Gallery');
            setSelectedImageUrls(data.images.map((img) => img.url));
            if (settings.image_auto_proxy) {
                setUseProxyThumbnails(/imagefap|pixiv|gelbooru|danbooru|sankaku|yande/i.test(target));
            }
        } catch (err) {
            setImageError(err.message);
            playStudioSfx('error', settings.audio_sfx, settings.sfx_style, settings.sfx_volume);
        } finally {
            setIsAnalyzingImages(false);
        }
    };

    const selectCurrentPage = () => {
        const pageUrls = paginatedGalleryImages.map((img) => img.url);
        setSelectedImageUrls((prev) => Array.from(new Set([...prev, ...pageUrls])));
    };

    const deselectCurrentPage = () => {
        const pageSet = new Set(paginatedGalleryImages.map((img) => img.url));
        setSelectedImageUrls((prev) => prev.filter((u) => !pageSet.has(u)));
    };

    const handleRetryJob = async (jobId) => {
        try {
            await fetch(`${API_BASE}/api/retry/${jobId}`, { method: 'POST' });
            playStudioSfx('queue', settings.audio_sfx, settings.sfx_style, settings.sfx_volume);
        } catch {
            // Ignore error
        }
    };

    const handleClearArchiveLedger = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/archive/clear`, { method: 'POST' });
            if (res.ok) fetchSystemAndSettings();
        } catch {
            // Ignore error
        }
    };

    const handleResetDefaults = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/settings/reset`, { method: 'POST' });
            if (res.ok) {
                const resetCfg = await res.json();
                setSettings(resetCfg);
                setSettingsSavedToast(true);
                setTimeout(() => setSettingsSavedToast(false), 2200);
                fetchSystemAndSettings();
            }
        } catch {
            // Ignore error
        }
    };

    // Queue computations
    const queueList = useMemo(() => Object.values(queueMap).reverse(), [queueMap]);
    const activeDownloads = useMemo(
        () => queueList.filter((j) => ['starting', 'downloading', 'processing'].includes(j.status)),
        [queueList]
    );
    const totalActiveSpeedMb = useMemo(
        () => activeDownloads.reduce((acc, j) => acc + (Number(j.speed_mb) || 0), 0).toFixed(2),
        [activeDownloads]
    );
    const filteredQueueList = useMemo(() => {
        if (queueFilter === 'active') return activeDownloads;
        if (queueFilter === 'completed') return queueList.filter((j) => j.status === 'completed');
        if (queueFilter === 'error') return queueList.filter((j) => ['error', 'cancelled'].includes(j.status));
        return queueList;
    }, [queueList, activeDownloads, queueFilter]);

    // Vault filtering & sorting
    const filteredVaultFiles = useMemo(() => {
        return vaultFiles
            .filter((f) => (vaultCategory === 'all' ? true : f.category === vaultCategory))
            .filter((f) =>
                vaultSearch.trim()
                    ? f.name.toLowerCase().includes(vaultSearch.trim().toLowerCase()) ||
                    (f.rel_path || '').toLowerCase().includes(vaultSearch.trim().toLowerCase())
                    : true
            )
            .sort((a, b) => {
                if (vaultSort === 'largest') return (b.size_mb || 0) - (a.size_mb || 0);
                if (vaultSort === 'name') return a.name.localeCompare(b.name);
                return (b.timestamp || 0) - (a.timestamp || 0);
            });
    }, [vaultFiles, vaultCategory, vaultSearch, vaultSort]);

    const vaultTotalSizeMb = useMemo(
        () => filteredVaultFiles.reduce((acc, f) => acc + (Number(f.size_mb) || 0), 0).toFixed(1),
        [filteredVaultFiles]
    );

    const filteredPlaylistEntries = useMemo(() => {
        if (!streamMeta?.entries) return [];
        const q = playlistFilter.trim().toLowerCase();
        if (!q) return streamMeta.entries;
        return streamMeta.entries.filter((e) => (e.title || '').toLowerCase().includes(q));
    }, [streamMeta, playlistFilter]);

    // Save Settings
    const handleSaveSettings = async (updatedObj) => {
        const payload = updatedObj || settings;
        try {
            const res = await fetch(`${API_BASE}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) {
                const saved = await res.json();
                setSettings(saved);
                setImagePageSize(Number(saved.image_page_size) || 24);
                setSettingsSavedToast(true);
                playStudioSfx('queue', saved.audio_sfx, saved.sfx_style, saved.sfx_volume);
                setTimeout(() => setSettingsSavedToast(false), 2200);
                fetchSystemAndSettings();
            }
        } catch {
            // Ignore error
        }
    };

    const activeLightboxItem = lightboxIndex !== null ? filteredGalleryImages[lightboxIndex] : null;
    const diskUsedPct =
        sysInfo.disk_total_gb > 0
            ? Math.round(((sysInfo.disk_total_gb - sysInfo.disk_free_gb) / sysInfo.disk_total_gb) * 100)
            : 0;
    const motionTransition = settings.reduce_motion ? { duration: 0 } : SPRING_SNAPPY;

    return (
        <div className={`min-h-screen ${activeTheme.bg} ${activeTheme.text} flex flex-col select-none font-sans transition-colors duration-200`}>
            {/* Top Studio Telemetry Header (Clean — Theme Switching Moved Exclusively to Preferences) */}
            <header className={`h-12 px-5 border-b ${activeTheme.border} ${activeTheme.panel} flex items-center justify-between shrink-0`}>
                <div className="flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                    <span className="text-xs font-semibold tracking-wider uppercase">Aura Studio</span>
                    {settings.show_header_telemetry && (
                        <>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                                yt-dlp {sysInfo.yt_dlp_version}
                            </span>
                            {sysInfo.curl_cffi_available && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50">
                                    TLS Impersonation Ready
                                </span>
                            )}
                        </>
                    )}
                    {activeDownloads.length > 0 && (
                        <span className="text-[10px] font-mono px-2.5 py-0.5 rounded bg-sky-950/70 text-sky-300 border border-sky-800/60 flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            {activeDownloads.length} active • {totalActiveSpeedMb} MB/s
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-3 text-xs">
                    {settings.show_header_telemetry && (
                        <div className="flex items-center gap-1.5 text-zinc-400 font-mono text-[11px]" title={`Total Disk: ${sysInfo.disk_total_gb} GB`}>
                            <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                            <span>{sysInfo.disk_free_gb} GB free</span>
                        </div>
                    )}

                    <button
                        onClick={() => {
                            const next = { ...settings, audio_sfx: !settings.audio_sfx };
                            setSettings(next);
                            handleSaveSettings(next);
                        }}
                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 transition"
                        title={settings.audio_sfx ? 'Studio Audio Chimes: ON' : 'Studio Audio Chimes: MUTED'}
                    >
                        {settings.audio_sfx ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                    </button>

                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition ${activeTab === 'settings'
                                ? 'bg-zinc-800 text-white border-zinc-600'
                                : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                            }`}
                    >
                        <Palette className="w-3 h-3" />
                        <span>{activeTheme.name}</span>
                    </button>
                </div>
            </header>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Navigation Rail */}
                <aside className={`w-56 border-r ${activeTheme.border} ${activeTheme.panel} p-3 flex flex-col justify-between shrink-0`}>
                    <nav className="space-y-1">
                        {[
                            { id: 'capture', label: 'Ingest Studio', icon: Terminal },
                            { id: 'images', label: 'Image Scraper', icon: ImageIcon, badge: galleryData?.images?.length || null },
                            { id: 'queue', label: 'Transfer Queue', icon: Layers, badge: activeDownloads.length || queueList.length || null },
                            { id: 'vault', label: 'Media Vault', icon: Database, badge: vaultFiles.length || null },
                            { id: 'settings', label: 'Preferences', icon: Sliders },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition ${isActive
                                            ? 'bg-zinc-800/90 text-white shadow-sm border border-zinc-700/60'
                                            : `${activeTheme.subtext} hover:text-zinc-200 hover:bg-zinc-900/50`
                                        }`}
                                >
                                    <div className="flex items-center gap-2.5">
                                        <Icon className="w-4 h-4" />
                                        <span>{tab.label}</span>
                                    </div>
                                    {tab.badge ? (
                                        <span className="px-1.5 py-0.5 text-[10px] font-mono rounded-md bg-zinc-700/80 text-zinc-200">
                                            {tab.badge}
                                        </span>
                                    ) : null}
                                </button>
                            );
                        })}
                    </nav>

                    {/* Bottom Output Folder & Disk Telemetry Card */}
                    <div className={`p-3 rounded-xl border ${activeTheme.border} ${activeTheme.card} space-y-2.5`}>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span className="font-medium">Vault Directory</span>
                            <button
                                onClick={() => fetch(`${API_BASE}/api/open-folder`, { method: 'POST' })}
                                className="text-zinc-300 hover:text-white flex items-center gap-1"
                            >
                                <FolderOpen className="w-3.5 h-3.5" />
                                Open
                            </button>
                        </div>
                        <p className="text-[10px] font-mono text-zinc-500 truncate" title={settings.download_dir || sysInfo.download_dir}>
                            {settings.download_dir || sysInfo.download_dir || 'Default Downloads'}
                        </p>
                        <div className="space-y-1 pt-1 border-t border-zinc-800/70">
                            <div className="flex justify-between text-[10px] font-mono text-zinc-500">
                                <span>Storage Used</span>
                                <span>{diskUsedPct}%</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden">
                                <div className={`h-full ${activeAccent.bar}`} style={{ width: `${Math.min(100, diskUsedPct)}%` }} />
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Content Viewport */}
                <main className={`flex-1 overflow-y-auto ${workspacePadding}`}>
                    <div className="max-w-6xl mx-auto">
                        <AnimatePresence mode="wait">
                            {/* ---------------- TAB 1: INGEST STUDIO ---------------- */}
                            {activeTab === 'capture' && (
                                <motion.div
                                    key="capture"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={motionTransition}
                                    className="space-y-6"
                                >
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Stream Ingest & Format Inspector</h1>
                                            <p className={`text-xs ${activeTheme.subtext} mt-0.5`}>
                                                Inspect codecs, batch-queue playlists, slice timecodes, or run multi-threaded extractions.
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                                            {settings.auto_paste_probe ? 'Press Ctrl+V anywhere to paste & probe' : 'Ctrl+V auto-probe paused'}
                                        </span>
                                    </div>

                                    {/* URL Input Bar */}
                                    <div className={`flex items-center ${activeTheme.panel} border ${activeTheme.border} rounded-xl p-1.5 shadow-inner`}>
                                        <input
                                            type="text"
                                            value={inputUrl}
                                            onChange={(e) => setInputUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyzeStream()}
                                            placeholder="Paste video, stream, or playlist URL (YouTube, Twitch, MissAV, Vimeo, SoundCloud...)"
                                            className="flex-1 px-3 py-2 bg-transparent text-xs font-mono focus:outline-none select-text"
                                        />
                                        {inputUrl && (
                                            <button onClick={() => setInputUrl('')} className="p-2 text-zinc-500 hover:text-zinc-300">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={async () => {
                                                const text = await navigator.clipboard.readText();
                                                if (text) setInputUrl(text.trim());
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-300 mr-1.5 transition"
                                        >
                                            <Clipboard className="w-3.5 h-3.5" />
                                            Paste
                                        </button>
                                        <button
                                            disabled={isAnalyzing || !inputUrl.trim()}
                                            onClick={() => handleAnalyzeStream()}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg ${activeAccent.btn} disabled:opacity-40 text-xs font-semibold transition`}
                                        >
                                            {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                                            {isAnalyzing ? 'Probing...' : 'Inspect Stream'}
                                        </button>
                                    </div>

                                    {/* Error Banner */}
                                    <AnimatePresence>
                                        {analyzeError && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-xs"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                                    <span className="font-mono break-all">{analyzeError}</span>
                                                </div>
                                                <button onClick={() => setAnalyzeError('')} className="text-red-400 hover:text-red-200 shrink-0 ml-3">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Single Video Stream Inspector Card */}
                                    {streamMeta && !streamMeta.is_playlist && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${activeTheme.panel} border ${activeTheme.border} rounded-2xl p-6 space-y-6 shadow-2xl`}
                                        >
                                            <div className="flex flex-col md:flex-row gap-5">
                                                {streamMeta.thumbnail && (
                                                    <img
                                                        src={streamMeta.thumbnail}
                                                        alt=""
                                                        className="w-full md:w-64 aspect-video object-cover rounded-xl border border-zinc-800 shrink-0 bg-zinc-950"
                                                    />
                                                )}
                                                <div className="flex-1 space-y-2.5">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono uppercase">
                                                            {streamMeta.extractor}
                                                        </span>
                                                        <span className="text-xs font-mono text-zinc-400">{formatDuration(streamMeta.duration)}</span>
                                                        {streamMeta.upload_date && (
                                                            <span className="text-xs font-mono text-zinc-500">
                                                                • {formatUploadDate(streamMeta.upload_date)}
                                                            </span>
                                                        )}
                                                        {streamMeta.view_count > 0 && (
                                                            <span className="text-xs font-mono text-zinc-500">
                                                                • {Number(streamMeta.view_count).toLocaleString()} views
                                                            </span>
                                                        )}
                                                        {streamMeta.has_subtitles && (
                                                            <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-mono">
                                                                CC / Subs Available
                                                            </span>
                                                        )}
                                                    </div>
                                                    <h2 className="text-base font-semibold leading-snug">{streamMeta.title}</h2>
                                                    <p className="text-xs text-zinc-400 font-medium">{streamMeta.uploader}</p>
                                                </div>
                                            </div>

                                            {/* Export Profile & Resolution Tiers */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-3 border-t border-zinc-800/80">
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                                                        Master Export Profile
                                                    </label>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        {[
                                                            { id: 'video', label: `Video (${settings.preferred_container.toUpperCase()})`, sub: `Codec: ${settings.preferred_video_codec.toUpperCase()}`, icon: Film },
                                                            { id: 'prores', label: 'Apple ProRes 422', sub: '10-Bit Edit Master (.MOV)', icon: Cpu },
                                                            { id: 'audio_flac', label: 'FLAC Lossless', sub: '24-Bit Studio Audio', icon: Music },
                                                            { id: 'audio_mp3', label: 'MP3 320kbps', sub: 'CBR High-Bitrate Audio', icon: Volume2 },
                                                        ].map((p) => {
                                                            const PIcon = p.icon;
                                                            return (
                                                                <button
                                                                    key={p.id}
                                                                    onClick={() => setExportMode(p.id)}
                                                                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${exportMode === p.id
                                                                            ? `${activeAccent.btn} border-transparent shadow-md`
                                                                            : `${activeTheme.card} ${activeTheme.border} text-zinc-300 hover:border-zinc-600`
                                                                        }`}
                                                                >
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-semibold">{p.label}</span>
                                                                        <PIcon className="w-3.5 h-3.5 opacity-70" />
                                                                    </div>
                                                                    <span className={`text-[10px] font-mono mt-1 ${exportMode === p.id ? 'opacity-75' : 'text-zinc-500'}`}>
                                                                        {p.sub}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {exportMode === 'video' && (
                                                    <div className="space-y-2">
                                                        <label className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider">
                                                            Resolution & Stream Codec Tier
                                                        </label>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {(streamMeta.stream_tiers?.length
                                                                ? streamMeta.stream_tiers
                                                                : [
                                                                    { height: 2160, fps: 60, vcodec: 'AUTO', dynamic_range: 'SDR' },
                                                                    { height: 1080, fps: 60, vcodec: 'AUTO', dynamic_range: 'SDR' },
                                                                    { height: 720, fps: 30, vcodec: 'AUTO', dynamic_range: 'SDR' },
                                                                ]
                                                            ).map((t) => {
                                                                const isSel = resolution === String(t.height);
                                                                return (
                                                                    <button
                                                                        key={t.height}
                                                                        onClick={() => setResolution(String(t.height))}
                                                                        className={`p-2.5 rounded-xl border text-left font-mono transition ${isSel
                                                                                ? `${activeAccent.btn} border-transparent font-semibold`
                                                                                : `${activeTheme.card} ${activeTheme.border} text-zinc-300 hover:border-zinc-600`
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center justify-between text-xs">
                                                                            <span>{t.height}p{t.fps >= 50 ? t.fps : ''}</span>
                                                                            {t.dynamic_range && t.dynamic_range !== 'SDR' && (
                                                                                <span className="px-1 rounded bg-amber-500/20 text-amber-400 text-[9px]">
                                                                                    {t.dynamic_range}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                        <div className={`text-[10px] mt-1 flex items-center justify-between ${isSel ? 'opacity-75' : 'text-zinc-500'}`}>
                                                                            <span>{t.vcodec || 'H264'}</span>
                                                                            {t.size_mb && <span>~{t.size_mb}M</span>}
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Mastering & Processing Toggles */}
                                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2">
                                                <button
                                                    onClick={() => setTrimEnabled(!trimEnabled)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${trimEnabled ? 'border-amber-500/60 bg-amber-500/10 text-amber-300' : `${activeTheme.card} ${activeTheme.border} text-zinc-400`
                                                        }`}
                                                >
                                                    <Scissors className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Sub-Clip Trim</span>
                                                </button>

                                                <button
                                                    onClick={() => setNormalizeAudio(!normalizeAudio)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${normalizeAudio ? 'border-sky-500/60 bg-sky-500/10 text-sky-300' : `${activeTheme.card} ${activeTheme.border} text-zinc-400`
                                                        }`}
                                                >
                                                    <Volume2 className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">-14 LUFS Audio</span>
                                                </button>

                                                <button
                                                    onClick={() => setWriteSubs(!writeSubs)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${writeSubs ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-300' : `${activeTheme.card} ${activeTheme.border} text-zinc-400`
                                                        }`}
                                                >
                                                    <Subtitles className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Embed Subs ({settings.sub_lang})</span>
                                                </button>

                                                <button
                                                    onClick={() =>
                                                        setSponsorblock((prev) => (prev === 'none' ? 'remove' : prev === 'remove' ? 'mark' : 'none'))
                                                    }
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${sponsorblock !== 'none'
                                                            ? 'border-purple-500/60 bg-purple-500/10 text-purple-300'
                                                            : `${activeTheme.card} ${activeTheme.border} text-zinc-400`
                                                        }`}
                                                >
                                                    <Shield className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">
                                                        Sponsors: {sponsorblock === 'none' ? 'Off' : sponsorblock === 'remove' ? 'Cut' : 'Mark'}
                                                    </span>
                                                </button>

                                                <button
                                                    onClick={() => setMultithread(!multithread)}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition ${multithread ? 'border-zinc-500 bg-zinc-800/70 text-zinc-200' : `${activeTheme.card} ${activeTheme.border} text-zinc-500`
                                                        }`}
                                                >
                                                    <Zap className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">{multithread ? `${settings.concurrent_fragments}x Threads` : '1x Thread'}</span>
                                                </button>

                                                <button
                                                    onClick={() => setSplitChapters(!splitChapters)}
                                                    disabled={!streamMeta.chapters?.length}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs transition disabled:opacity-40 ${splitChapters ? 'border-pink-500/60 bg-pink-500/10 text-pink-300' : `${activeTheme.card} ${activeTheme.border} text-zinc-400`
                                                        }`}
                                                >
                                                    <Split className="w-3.5 h-3.5 shrink-0" />
                                                    <span className="truncate">Split Chapters ({streamMeta.chapters?.length || 0})</span>
                                                </button>
                                            </div>

                                            {trimEnabled && (
                                                <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <span className="text-xs font-mono text-amber-400">Frame-Accurate Slice:</span>
                                                        <input
                                                            type="text"
                                                            value={trimStart}
                                                            onChange={(e) => setTrimStart(e.target.value)}
                                                            placeholder="00:00 (Start)"
                                                            className="w-32 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono select-text"
                                                        />
                                                        <span className="text-xs text-zinc-500">to</span>
                                                        <input
                                                            type="text"
                                                            value={trimEnd}
                                                            onChange={(e) => setTrimEnd(e.target.value)}
                                                            placeholder={formatSecondsToTC(streamMeta.duration) || '02:30 (End)'}
                                                            className="w-32 px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono select-text"
                                                        />
                                                    </div>

                                                    {streamMeta.chapters?.length > 0 && (
                                                        <div className="space-y-1.5 pt-1">
                                                            <span className="text-[10px] font-mono text-zinc-400 uppercase">
                                                                Click a chapter below to auto-fill timecodes:
                                                            </span>
                                                            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                                                                {streamMeta.chapters.map((ch, idx) => (
                                                                    <button
                                                                        key={idx}
                                                                        onClick={() => {
                                                                            setTrimStart(formatSecondsToTC(ch.start_time));
                                                                            setTrimEnd(formatSecondsToTC(ch.end_time));
                                                                        }}
                                                                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-200 transition"
                                                                    >
                                                                        {ch.title} ({formatSecondsToTC(ch.start_time)} - {formatSecondsToTC(ch.end_time)})
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            <button
                                                onClick={handleDispatchDownload}
                                                className={`w-full py-3.5 rounded-xl ${activeAccent.btn} font-semibold text-xs tracking-wide flex items-center justify-center gap-2 shadow-lg transition`}
                                            >
                                                <Download className="w-4 h-4" />
                                                Start High-Speed Stream Extraction
                                            </button>
                                        </motion.div>
                                    )}

                                    {/* Playlist Batch Inspector Card */}
                                    {streamMeta && streamMeta.is_playlist && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 12 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${activeTheme.panel} border ${activeTheme.border} rounded-2xl p-6 space-y-5 shadow-2xl`}
                                        >
                                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30 text-[10px] font-mono uppercase">
                                                            Playlist Feed • {streamMeta.entries?.length || 0} Items
                                                        </span>
                                                        <span className="text-xs font-mono text-zinc-400">{selectedPlaylistIds.length} selected</span>
                                                    </div>
                                                    <h2 className="text-base font-semibold mt-1">{streamMeta.title}</h2>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={playlistFilter}
                                                        onChange={(e) => setPlaylistFilter(e.target.value)}
                                                        placeholder="Filter playlist titles..."
                                                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono w-48"
                                                    />
                                                    <button
                                                        onClick={() => setSelectedPlaylistIds(streamMeta.entries.map((e) => e.id))}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs"
                                                    >
                                                        Select All
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedPlaylistIds([])}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs"
                                                    >
                                                        Deselect All
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setSelectedPlaylistIds((prev) =>
                                                                streamMeta.entries.map((e) => e.id).filter((id) => !prev.includes(id))
                                                            )
                                                        }
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs"
                                                    >
                                                        Invert
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="max-h-96 overflow-y-auto space-y-1.5 pr-1">
                                                {filteredPlaylistEntries.map((item) => {
                                                    const checked = selectedPlaylistIds.includes(item.id);
                                                    return (
                                                        <div
                                                            key={item.id}
                                                            onClick={() =>
                                                                setSelectedPlaylistIds((prev) =>
                                                                    checked ? prev.filter((i) => i !== item.id) : [...prev, item.id]
                                                                )
                                                            }
                                                            className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${checked ? 'border-zinc-500 bg-zinc-800/40' : 'border-zinc-800/60 opacity-55 hover:opacity-80'
                                                                }`}
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                {checked ? (
                                                                    <CheckSquare className="w-4 h-4 text-zinc-100 shrink-0" />
                                                                ) : (
                                                                    <Square className="w-4 h-4 text-zinc-600 shrink-0" />
                                                                )}
                                                                <span className="text-[10px] font-mono text-zinc-500 w-7">#{item.index}</span>
                                                                {item.thumbnail && (
                                                                    <img src={item.thumbnail} alt="" className="w-12 h-7 object-cover rounded border border-zinc-800 shrink-0" />
                                                                )}
                                                                <span className="text-xs truncate">{item.title}</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-zinc-400 shrink-0 ml-3">
                                                                {formatDuration(item.duration)}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            <button
                                                disabled={selectedPlaylistIds.length === 0}
                                                onClick={handleDispatchDownload}
                                                className={`w-full py-3.5 rounded-xl ${activeAccent.btn} disabled:opacity-40 font-semibold text-xs flex items-center justify-center gap-2`}
                                            >
                                                <Download className="w-4 h-4" />
                                                Batch Queue {selectedPlaylistIds.length} Playlist Streams
                                            </button>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}

                            {/* ---------------- TAB 2: PAGINATED IMAGE SCRAPER ---------------- */}
                            {activeTab === 'images' && (
                                <motion.div
                                    key="images"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={motionTransition}
                                    className="space-y-6"
                                >
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Gallery Image Scraper</h1>
                                            <p className={`text-xs ${activeTheme.subtext} mt-0.5`}>
                                                Paginated, memory-safe gallery harvesting with parallel full-resolution downloading.
                                            </p>
                                        </div>
                                        <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400">
                                            {imagePageSize} images/page • {settings.image_concurrency}x parallel threads
                                        </span>
                                    </div>

                                    {/* Gallery URL Input Bar */}
                                    <div className={`flex items-center ${activeTheme.panel} border ${activeTheme.border} rounded-xl p-1.5 shadow-inner`}>
                                        <div className="pl-3 pr-2 text-zinc-500">
                                            <ImageIcon className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={imageInputUrl}
                                            onChange={(e) => setImageInputUrl(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleScanGallery()}
                                            placeholder="Paste gallery or webpage URL (ImageFap, Imgur, Reddit, DeviantArt, Pixiv, web pages...)"
                                            className="flex-1 py-2 bg-transparent text-xs font-mono focus:outline-none select-text"
                                        />
                                        {imageInputUrl && (
                                            <button onClick={() => setImageInputUrl('')} className="p-2 text-zinc-500 hover:text-zinc-300">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={async () => {
                                                const text = await navigator.clipboard.readText();
                                                if (text) setImageInputUrl(text.trim());
                                            }}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-xs text-zinc-300 mr-1.5 transition"
                                        >
                                            <Clipboard className="w-3.5 h-3.5" />
                                            Paste
                                        </button>
                                        <button
                                            disabled={isAnalyzingImages || !imageInputUrl.trim()}
                                            onClick={() => handleScanGallery()}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg ${activeAccent.btn} disabled:opacity-40 text-xs font-semibold transition`}
                                        >
                                            {isAnalyzingImages ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Terminal className="w-3.5 h-3.5" />}
                                            {isAnalyzingImages ? 'Scanning...' : 'Scan Gallery'}
                                        </button>
                                    </div>

                                    {imageError && (
                                        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-xs">
                                            <div className="flex items-center gap-2.5">
                                                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                                <span className="font-mono">{imageError}</span>
                                            </div>
                                            <button onClick={() => setImageError('')} className="text-red-400 hover:text-red-200">
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}

                                    {/* Paginated Gallery Workspace */}
                                    {galleryData && (
                                        <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-2xl p-6 space-y-5 shadow-2xl`}>
                                            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                                                <div className="space-y-1.5 flex-1 min-w-[240px]">
                                                    <div className="flex items-center gap-2">
                                                        <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-500/30 text-[10px] font-mono uppercase">
                                                            {galleryData.images.length} Total Images
                                                        </span>
                                                        <span className="text-xs font-mono text-zinc-400">
                                                            {selectedImageUrls.length} selected across all pages
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-zinc-400">Vault Subfolder:</span>
                                                        <input
                                                            type="text"
                                                            value={galleryFolderName}
                                                            onChange={(e) => setGalleryFolderName(e.target.value)}
                                                            className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-100 w-72 select-text"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="flex flex-wrap items-center gap-1.5">
                                                    <button
                                                        onClick={selectCurrentPage}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                    >
                                                        Select Page ({paginatedGalleryImages.length})
                                                    </button>
                                                    <button
                                                        onClick={deselectCurrentPage}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                    >
                                                        Deselect Page
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedImageUrls(galleryData.images.map((img) => img.url))}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                    >
                                                        Select All ({galleryData.images.length})
                                                    </button>
                                                    <button
                                                        onClick={() => setSelectedImageUrls([])}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                    >
                                                        Clear All
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            setSelectedImageUrls((prev) => {
                                                                const set = new Set(prev);
                                                                return galleryData.images.map((i) => i.url).filter((u) => !set.has(u));
                                                            })
                                                        }
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                    >
                                                        Invert
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Filter, Page Size & Pagination Bar */}
                                            <div className="flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <div className="relative">
                                                        <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
                                                        <input
                                                            type="text"
                                                            value={imageSearchQuery}
                                                            onChange={(e) => {
                                                                setImageSearchQuery(e.target.value);
                                                                setImagePage(1);
                                                            }}
                                                            placeholder="Filter filenames..."
                                                            className="pl-8 pr-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono w-48 focus:outline-none select-text"
                                                        />
                                                    </div>

                                                    <select
                                                        value={imagePageSize}
                                                        onChange={(e) => {
                                                            setImagePageSize(Number(e.target.value));
                                                            setImagePage(1);
                                                        }}
                                                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300"
                                                    >
                                                        <option value={12}>12 / page</option>
                                                        <option value={24}>24 / page</option>
                                                        <option value={48}>48 / page</option>
                                                        <option value={96}>96 / page</option>
                                                    </select>

                                                    <button
                                                        onClick={() => setCompactImageGrid(!compactImageGrid)}
                                                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                                                        title="Toggle Compact / Large Grid"
                                                    >
                                                        {compactImageGrid ? <LayoutGrid className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
                                                    </button>

                                                    <button
                                                        onClick={() => setUseProxyThumbnails(!useProxyThumbnails)}
                                                        className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-mono transition ${useProxyThumbnails
                                                                ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                                                                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                                                            }`}
                                                    >
                                                        Proxy Previews: {useProxyThumbnails ? 'ON' : 'OFF'}
                                                    </button>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <button
                                                        disabled={safeImagePage <= 1}
                                                        onClick={() => setImagePage((p) => Math.max(1, p - 1))}
                                                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30 hover:bg-zinc-800"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-xs font-mono text-zinc-300 px-2">
                                                        Page {safeImagePage} of {totalImagePages}
                                                    </span>
                                                    <button
                                                        disabled={safeImagePage >= totalImagePages}
                                                        onClick={() => setImagePage((p) => Math.min(totalImagePages, p + 1))}
                                                        className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 disabled:opacity-30 hover:bg-zinc-800"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Paginated Thumbnail Grid */}
                                            <div
                                                className={`grid ${compactImageGrid ? 'grid-cols-3 sm:grid-cols-6 gap-2.5' : 'grid-cols-2 sm:grid-cols-4 gap-3.5'
                                                    }`}
                                            >
                                                {paginatedGalleryImages.map((img, idx) => {
                                                    const globalIdxZero = (safeImagePage - 1) * imagePageSize + idx;
                                                    const globalIndex = globalIdxZero + 1;
                                                    const isSelected = selectedSet.has(img.url);
                                                    const displaySrc = useProxyThumbnails
                                                        ? `${API_BASE}/api/images/proxy?url=${encodeURIComponent(img.thumb || img.url)}`
                                                        : img.thumb || img.url;

                                                    return (
                                                        <div
                                                            key={img.url}
                                                            onClick={() => {
                                                                setSelectedImageUrls((prev) =>
                                                                    isSelected ? prev.filter((u) => u !== img.url) : [...prev, img.url]
                                                                );
                                                            }}
                                                            className={`relative group aspect-square rounded-xl overflow-hidden bg-zinc-950 border cursor-pointer transition ${isSelected
                                                                    ? `${activeAccent.ring} ring-2`
                                                                    : 'border-zinc-800/80 opacity-45 hover:opacity-75'
                                                                }`}
                                                        >
                                                            <img
                                                                src={displaySrc}
                                                                alt={img.title}
                                                                loading="lazy"
                                                                decoding="async"
                                                                className="w-full h-full object-cover"
                                                            />
                                                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                                                                <div
                                                                    className={`w-4 h-4 rounded flex items-center justify-center ${isSelected ? `${activeAccent.btn}` : 'bg-black/70 border border-white/25'
                                                                        }`}
                                                                >
                                                                    {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                                                </div>
                                                                <span className="px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-zinc-300">
                                                                    #{globalIndex}
                                                                </span>
                                                            </div>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setLightboxIndex(globalIdxZero);
                                                                }}
                                                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-zinc-200 opacity-0 group-hover:opacity-100 transition hover:bg-black"
                                                                title="Inspect Full Image"
                                                            >
                                                                <Maximize2 className="w-3.5 h-3.5" />
                                                            </button>

                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2 flex items-center justify-between">
                                                                <p className="text-[10px] font-mono text-zinc-200 truncate">{img.title}</p>
                                                                {img.ext && (
                                                                    <span className="text-[9px] font-mono px-1 rounded bg-white/10 text-zinc-300 shrink-0">
                                                                        {img.ext}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>

                                            {/* Bottom Pagination & Download Button */}
                                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-zinc-800/80">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {Array.from({ length: Math.min(totalImagePages, 10) }, (_, i) => i + 1).map((p) => (
                                                        <button
                                                            key={p}
                                                            onClick={() => setImagePage(p)}
                                                            className={`w-7 h-7 rounded-lg text-xs font-mono transition ${safeImagePage === p
                                                                    ? `${activeAccent.btn} font-bold`
                                                                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                                                }`}
                                                        >
                                                            {p}
                                                        </button>
                                                    ))}
                                                    {totalImagePages > 10 && (
                                                        <button
                                                            onClick={() => setImagePage(totalImagePages)}
                                                            className={`px-2 h-7 rounded-lg text-xs font-mono transition ${safeImagePage === totalImagePages
                                                                    ? `${activeAccent.btn} font-bold`
                                                                    : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                                                }`}
                                                        >
                                                            ... {totalImagePages}
                                                        </button>
                                                    )}
                                                </div>

                                                <button
                                                    disabled={selectedImageUrls.length === 0}
                                                    onClick={async () => {
                                                        try {
                                                            await fetch(`${API_BASE}/api/images/download`, {
                                                                method: 'POST',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({
                                                                    image_urls: selectedImageUrls,
                                                                    folder_name: galleryFolderName.trim() || galleryData.title || 'Image Vault',
                                                                    source_url: galleryData.source_url || imageInputUrl,
                                                                }),
                                                            });
                                                            playStudioSfx('queue', settings.audio_sfx, settings.sfx_style, settings.sfx_volume);
                                                            setActiveTab('queue');
                                                        } catch {
                                                            setImageError('Failed to dispatch image download task.');
                                                        }
                                                    }}
                                                    className={`px-6 py-3 rounded-xl ${activeAccent.btn} disabled:opacity-40 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition`}
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Download {selectedImageUrls.length} Full-Resolution Images ({settings.image_concurrency}x Threads)
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ---------------- TAB 3: TRANSFER QUEUE ---------------- */}
                            {activeTab === 'queue' && (
                                <motion.div
                                    key="queue"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={motionTransition}
                                    className="space-y-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Transfer Queue & Live Telemetry</h1>
                                            <p className={`text-xs ${activeTheme.subtext} mt-0.5`}>
                                                Real-time WebSocket progress for active video streams, audio masters, and parallel image batches.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {['all', 'active', 'completed', 'error'].map((f) => (
                                                <button
                                                    key={f}
                                                    onClick={() => setQueueFilter(f)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${queueFilter === f ? `${activeAccent.btn}` : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                                        }`}
                                                >
                                                    {f}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() =>
                                                    setQueueMap((prev) => {
                                                        const next = {};
                                                        Object.entries(prev).forEach(([k, v]) => {
                                                            if (v.status !== 'completed') next[k] = v;
                                                        });
                                                        return next;
                                                    })
                                                }
                                                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                            >
                                                Clear Completed
                                            </button>
                                        </div>
                                    </div>

                                    {filteredQueueList.length === 0 ? (
                                        <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-2xl p-12 text-center text-xs text-zinc-500`}>
                                            No transfer jobs in this view.
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {filteredQueueList.map((job) => (
                                                <div
                                                    key={job.id}
                                                    className={`${activeTheme.panel} border ${activeTheme.border} rounded-xl p-4 flex flex-col gap-3`}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3.5 min-w-0">
                                                            {job.thumbnail && (
                                                                <img
                                                                    src={job.thumbnail}
                                                                    alt=""
                                                                    className="w-16 h-10 object-cover rounded-lg border border-zinc-800 shrink-0 bg-zinc-950"
                                                                />
                                                            )}
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <span
                                                                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${job.status === 'completed'
                                                                                ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/50'
                                                                                : job.status === 'error'
                                                                                    ? 'bg-red-950/80 text-red-400 border border-red-800/50'
                                                                                    : 'bg-zinc-800 text-zinc-300'
                                                                            }`}
                                                                    >
                                                                        {job.status}
                                                                    </span>
                                                                    {job.mode && (
                                                                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                                                                            {job.mode} {job.resolution ? `• ${job.resolution}${job.mode === 'video' ? 'p' : ''}` : ''}
                                                                        </span>
                                                                    )}
                                                                    <h3 className="text-xs font-semibold truncate">{job.title}</h3>
                                                                </div>
                                                                {job.uploader && <p className="text-[11px] text-zinc-500 mt-0.5">{job.uploader}</p>}
                                                                {job.error && <p className="text-[11px] font-mono text-red-400 mt-1">{job.error}</p>}
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3 shrink-0 text-xs font-mono text-zinc-400">
                                                            {job.downloaded_mb > 0 && (
                                                                <span className="text-[11px] text-zinc-500">
                                                                    {job.downloaded_mb} {job.size_mb > 0 ? `/ ${job.size_mb}` : ''} MB
                                                                </span>
                                                            )}
                                                            {job.speed_mb > 0 && <span className="text-emerald-400">{job.speed_mb} MB/s</span>}
                                                            {job.eta > 0 && job.status === 'downloading' && (
                                                                <span className="text-zinc-500">ETA {formatEta(job.eta)}</span>
                                                            )}
                                                            <span className="text-zinc-200 font-semibold">{job.percent || 0}%</span>

                                                            {['starting', 'downloading'].includes(job.status) && (
                                                                <button
                                                                    onClick={() => fetch(`${API_BASE}/api/cancel/${job.id}`, { method: 'POST' })}
                                                                    className="px-2.5 py-1 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/50 text-[10px]"
                                                                >
                                                                    Cancel
                                                                </button>
                                                            )}

                                                            {['error', 'cancelled'].includes(job.status) && (
                                                                <button
                                                                    onClick={() => handleRetryJob(job.id)}
                                                                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[10px] flex items-center gap-1"
                                                                >
                                                                    <RotateCcw className="w-3 h-3" />
                                                                    Retry
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full transition-all duration-200 ${job.status === 'completed'
                                                                    ? 'bg-emerald-400'
                                                                    : job.status === 'error'
                                                                        ? 'bg-red-500'
                                                                        : activeAccent.bar
                                                                }`}
                                                            style={{ width: `${Math.min(100, job.percent || 0)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ---------------- TAB 4: MEDIA VAULT ---------------- */}
                            {activeTab === 'vault' && (
                                <motion.div
                                    key="vault"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={motionTransition}
                                    className="space-y-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Local Media Vault</h1>
                                            <p className={`text-xs ${activeTheme.subtext} mt-0.5`}>
                                                {filteredVaultFiles.length} indexed files ({vaultTotalSizeMb} MB total) across video masters, audio, and scraped galleries.
                                            </p>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-2">
                                            {[
                                                { id: 'all', label: 'All Files' },
                                                { id: 'video', label: 'Video' },
                                                { id: 'audio', label: 'Audio' },
                                                { id: 'image', label: 'Images' },
                                            ].map((cat) => (
                                                <button
                                                    key={cat.id}
                                                    onClick={() => setVaultCategory(cat.id)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${vaultCategory === cat.id
                                                            ? `${activeAccent.btn}`
                                                            : 'bg-zinc-900 text-zinc-400 hover:text-white'
                                                        }`}
                                                >
                                                    {cat.label}
                                                </button>
                                            ))}

                                            <input
                                                type="text"
                                                value={vaultSearch}
                                                onChange={(e) => setVaultSearch(e.target.value)}
                                                placeholder="Search vault..."
                                                className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono w-44 select-text"
                                            />

                                            <select
                                                value={vaultSort}
                                                onChange={(e) => setVaultSort(e.target.value)}
                                                className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300"
                                            >
                                                <option value="newest">Newest First</option>
                                                <option value="largest">Largest Size</option>
                                                <option value="name">Filename A-Z</option>
                                            </select>

                                            <button
                                                onClick={fetchVault}
                                                className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white"
                                                title="Refresh Vault Index"
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-2xl divide-y divide-zinc-800/60`}>
                                        {filteredVaultFiles.length === 0 ? (
                                            <div className="p-12 text-center text-xs text-zinc-500">No matching files in Vault.</div>
                                        ) : (
                                            filteredVaultFiles.map((file) => (
                                                <div
                                                    key={file.path}
                                                    className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/40 transition"
                                                >
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono text-zinc-300">
                                                                {file.ext}
                                                            </span>
                                                            <p className="text-xs font-medium truncate">{file.rel_path || file.name}</p>
                                                        </div>
                                                        <p className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                                            {file.size_mb} MB • {file.modified}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() =>
                                                                fetch(`${API_BASE}/api/open-folder?path=${encodeURIComponent(file.path)}`, {
                                                                    method: 'POST',
                                                                })
                                                            }
                                                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs flex items-center gap-1"
                                                        >
                                                            <FolderOpen className="w-3.5 h-3.5" />
                                                            Reveal
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                await fetch(`${API_BASE}/api/vault?path=${encodeURIComponent(file.path)}`, {
                                                                    method: 'DELETE',
                                                                });
                                                                fetchVault();
                                                            }}
                                                            className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400"
                                                            title="Delete file from disk"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {/* ---------------- TAB 5: TABBED, SPACIOUS STUDIO PREFERENCES ---------------- */}
                            {activeTab === 'settings' && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={motionTransition}
                                    className="space-y-7 pb-12"
                                >
                                    {/* Top Header & Save Action */}
                                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-5">
                                        <div>
                                            <h1 className="text-xl font-semibold tracking-tight">Studio Preferences</h1>
                                            <p className={`text-xs ${activeTheme.subtext} mt-1`}>
                                                Personalize studio themes, workspace ergonomics, mastering codecs, gallery pagination, and anti-bot networking.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={handleResetDefaults}
                                                className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-300 transition"
                                            >
                                                Reset Defaults
                                            </button>
                                            <button
                                                onClick={() => handleSaveSettings(settings)}
                                                className={`px-5 py-2.5 rounded-xl ${activeAccent.btn} text-xs font-semibold flex items-center gap-2 shadow-lg transition`}
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                {settingsSavedToast ? 'Configuration Saved!' : 'Save Configuration'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Spacious Category Sub-Navigation */}
                                    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800/60 pb-4">
                                        {[
                                            { id: 'appearance', label: 'Appearance & Themes', icon: Palette },
                                            { id: 'storage', label: 'Storage & Automation', icon: HardDrive },
                                            { id: 'mastering', label: 'Video & Audio Mastering', icon: Film },
                                            { id: 'scraper', label: 'Image Scraper Engine', icon: ImageIcon },
                                            { id: 'network', label: 'Network & Anti-Bot', icon: Globe },
                                            { id: 'system', label: 'Audio & Diagnostics', icon: Activity },
                                        ].map((tab) => {
                                            const SIcon = tab.icon;
                                            const isSubActive = settingsSubTab === tab.id;
                                            return (
                                                <button
                                                    key={tab.id}
                                                    onClick={() => setSettingsSubTab(tab.id)}
                                                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium transition ${isSubActive
                                                            ? `${activeAccent.btn} shadow-md`
                                                            : `${activeTheme.panel} border ${activeTheme.border} text-zinc-400 hover:text-zinc-200`
                                                        }`}
                                                >
                                                    <SIcon className="w-3.5 h-3.5" />
                                                    <span>{tab.label}</span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* SUB-TAB 1: APPEARANCE & THEMES */}
                                    {settingsSubTab === 'appearance' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-7"
                                        >
                                            {/* Studio Theme Gallery */}
                                            <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-5`}>
                                                <div>
                                                    <h2 className="text-sm font-semibold">Color Theme Palette</h2>
                                                    <p className="text-xs text-zinc-400 mt-0.5">
                                                        Choose a calibrated surface theme for your environment. Changes apply immediately.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                                    {Object.entries(THEME_STYLES).map(([key, t]) => {
                                                        const isSelected = settings.theme === key;
                                                        return (
                                                            <div
                                                                key={key}
                                                                onClick={() => {
                                                                    const next = { ...settings, theme: key };
                                                                    setSettings(next);
                                                                    handleSaveSettings(next);
                                                                }}
                                                                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between gap-4 ${isSelected
                                                                        ? `${activeAccent.ring} ring-2 bg-zinc-900/90`
                                                                        : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                                                                    }`}
                                                            >
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-semibold text-zinc-100">{t.name}</span>
                                                                        {isSelected && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                                                                    </div>
                                                                    <p className="text-[11px] text-zinc-400 leading-snug">{t.desc}</p>
                                                                </div>

                                                                <div className="flex items-center gap-1.5 pt-2">
                                                                    {t.swatches.map((hex, i) => (
                                                                        <span
                                                                            key={i}
                                                                            className="h-5 flex-1 rounded-md border border-white/10"
                                                                            style={{ backgroundColor: hex }}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {/* Interactive Accent Color & Workspace Density */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                                <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-4`}>
                                                    <div>
                                                        <h2 className="text-sm font-semibold">Interactive Accent Color</h2>
                                                        <p className="text-xs text-zinc-400 mt-0.5">
                                                            Customizes primary action buttons, progress bars, and selection highlights.
                                                        </p>
                                                    </div>
                                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
                                                        {Object.entries(ACCENT_PALETTES).map(([key, acc]) => {
                                                            const isSel = settings.accent_color === key;
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    onClick={() => {
                                                                        const next = { ...settings, accent_color: key };
                                                                        setSettings(next);
                                                                        handleSaveSettings(next);
                                                                    }}
                                                                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-medium transition ${isSel
                                                                            ? 'border-white bg-zinc-800/90 text-white'
                                                                            : 'border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-zinc-200'
                                                                        }`}
                                                                >
                                                                    <span
                                                                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20"
                                                                        style={{ backgroundColor: acc.swatch }}
                                                                    />
                                                                    <span className="truncate">{acc.label}</span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-4`}>
                                                    <div>
                                                        <h2 className="text-sm font-semibold">Workspace Layout & Ergonomics</h2>
                                                        <p className="text-xs text-zinc-400 mt-0.5">
                                                            Adjust viewport spacing, motion physics, and header status badges.
                                                        </p>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <label className="text-xs text-zinc-300">Viewport Spacing Density</label>
                                                        <div className="grid grid-cols-3 gap-2.5">
                                                            {[
                                                                { id: 'compact', label: 'Compact' },
                                                                { id: 'comfortable', label: 'Comfortable' },
                                                                { id: 'spacious', label: 'Spacious' },
                                                            ].map((d) => (
                                                                <button
                                                                    key={d.id}
                                                                    onClick={() => setSettings({ ...settings, ui_density: d.id })}
                                                                    className={`py-2.5 rounded-xl border text-xs font-medium transition ${settings.ui_density === d.id
                                                                            ? `${activeAccent.btn} border-transparent`
                                                                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                                                                        }`}
                                                                >
                                                                    {d.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="space-y-3 pt-2">
                                                        <SettingToggle
                                                            title="Show Engine & Disk Telemetry in Header"
                                                            description="Displays yt-dlp version, TLS status, and free disk space in the top bar."
                                                            checked={Boolean(settings.show_header_telemetry)}
                                                            onChange={(val) => setSettings({ ...settings, show_header_telemetry: val })}
                                                            accentPill={activeAccent.pill}
                                                        />
                                                        <SettingToggle
                                                            title="Reduce Interface Motion"
                                                            description="Disables spring animations for instant tab transitions."
                                                            checked={Boolean(settings.reduce_motion)}
                                                            onChange={(val) => setSettings({ ...settings, reduce_motion: val })}
                                                            accentPill={activeAccent.pill}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* SUB-TAB 2: STORAGE & AUTOMATION */}
                                    {settingsSubTab === 'storage' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-6`}
                                        >
                                            <div>
                                                <h2 className="text-sm font-semibold">Storage Paths, Naming Templates & Automation</h2>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    Control where files land on disk, how filenames are formatted for Jellyfin/Plex, and clipboard behavior.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Output Vault Directory</label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={settings.download_dir || sysInfo.download_dir}
                                                            onChange={(e) => setSettings({ ...settings, download_dir: e.target.value })}
                                                            className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono select-text"
                                                        />
                                                        <button
                                                            onClick={async () => {
                                                                const res = await fetch(`${API_BASE}/api/pick-folder`, { method: 'POST' });
                                                                const data = await res.json();
                                                                if (data.path) setSettings({ ...settings, download_dir: data.path });
                                                            }}
                                                            className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium"
                                                        >
                                                            Browse
                                                        </button>
                                                    </div>
                                                    <p className="text-[11px] text-zinc-500">
                                                        All downloaded videos, audio masters, and scraped image folders are stored here.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">File Naming Template</label>
                                                    <select
                                                        value={settings.naming_template}
                                                        onChange={(e) => setSettings({ ...settings, naming_template: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="standard">Standard — Title [ID].ext</option>
                                                        <option value="media_server">Jellyfin / Plex — YYYY-MM-DD - Title [ID].ext</option>
                                                        <option value="channel_title">Creator Prefix — Channel - Title [ID].ext</option>
                                                        <option value="clean">Clean Title — Title.ext</option>
                                                        <option value="id_only">Stream ID Only — ID.ext</option>
                                                    </select>
                                                    <p className="text-[11px] text-zinc-500">
                                                        Applies to all video and audio extractions.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <SettingToggle
                                                    title="Group Videos into /Creator/ Subfolders"
                                                    description="Automatically sorts downloaded videos into sub-directories named after the channel or uploader."
                                                    checked={Boolean(settings.organizer_subfolder)}
                                                    onChange={(val) => setSettings({ ...settings, organizer_subfolder: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Enforce ASCII-Safe Filenames"
                                                    description="Strips spaces, emojis, and non-ASCII characters from filenames for strict NAS/Linux compatibility."
                                                    checked={Boolean(settings.restrict_filenames)}
                                                    onChange={(val) => setSettings({ ...settings, restrict_filenames: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Auto-Probe Clipboard on Ctrl+V"
                                                    description="Pressing Ctrl+V anywhere in Ingest Studio or Image Scraper immediately starts inspecting the URL."
                                                    checked={Boolean(settings.auto_paste_probe)}
                                                    onChange={(val) => setSettings({ ...settings, auto_paste_probe: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Auto-Open Folder When Job Completes"
                                                    description="Launches Windows Explorer in your output directory as soon as a download finishes."
                                                    checked={Boolean(settings.auto_open_folder)}
                                                    onChange={(val) => setSettings({ ...settings, auto_open_folder: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title={`Skip Duplicates via Archive Ledger (${sysInfo.archive_count} IDs)`}
                                                    description="Records every downloaded video ID in archive.txt and skips previously archived streams."
                                                    checked={Boolean(settings.use_archive)}
                                                    onChange={(val) => setSettings({ ...settings, use_archive: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Write .info.json Sidecar Metadata"
                                                    description="Saves complete stream metadata alongside media files for Jellyfin or local archival indexing."
                                                    checked={Boolean(settings.write_info_json)}
                                                    onChange={(val) => setSettings({ ...settings, write_info_json: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* SUB-TAB 3: VIDEO & AUDIO MASTERING */}
                                    {settingsSubTab === 'mastering' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-6`}
                                        >
                                            <div>
                                                <h2 className="text-sm font-semibold">Video & Audio Mastering Defaults</h2>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    Configure default codecs, containers, framerate priorities, and FFmpeg post-processing chains.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Default Export Profile</label>
                                                    <select
                                                        value={settings.default_export_mode}
                                                        onChange={(e) => setSettings({ ...settings, default_export_mode: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="video">Video Master</option>
                                                        <option value="prores">Apple ProRes 422 (.MOV)</option>
                                                        <option value="audio_flac">FLAC Lossless Audio</option>
                                                        <option value="audio_mp3">MP3 320kbps CBR</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Default Resolution Cap</label>
                                                    <select
                                                        value={settings.default_resolution}
                                                        onChange={(e) => setSettings({ ...settings, default_resolution: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="2160">4K UHD (2160p)</option>
                                                        <option value="1440">QHD (1440p)</option>
                                                        <option value="1080">Full HD (1080p)</option>
                                                        <option value="720">HD (720p)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Preferred Framerate</label>
                                                    <select
                                                        value={settings.preferred_fps}
                                                        onChange={(e) => setSettings({ ...settings, preferred_fps: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="any">Highest Available (60fps+)</option>
                                                        <option value="60">Cap at 60fps</option>
                                                        <option value="30">Prefer 30fps (Smaller Files)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Preferred Video Codec</label>
                                                    <select
                                                        value={settings.preferred_video_codec}
                                                        onChange={(e) => setSettings({ ...settings, preferred_video_codec: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="auto">Auto (Highest Bitrate)</option>
                                                        <option value="avc1">H.264 / AVC1 (Premiere & Resolve Ready)</option>
                                                        <option value="av01">AV1 (Next-Gen Compression)</option>
                                                        <option value="vp9">VP9 (Web Master)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Preferred Container Format</label>
                                                    <select
                                                        value={settings.preferred_container}
                                                        onChange={(e) => setSettings({ ...settings, preferred_container: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="mp4">MP4 Container (.mp4)</option>
                                                        <option value="mkv">Matroska Container (.mkv)</option>
                                                        <option value="webm">WebM Container (.webm)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Default SponsorBlock Mode</label>
                                                    <select
                                                        value={settings.default_sponsorblock}
                                                        onChange={(e) => setSettings({ ...settings, default_sponsorblock: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="none">Disabled</option>
                                                        <option value="remove">Automatically Cut Sponsor Segments</option>
                                                        <option value="mark">Mark Sponsors as Chapter Markers</option>
                                                    </select>
                                                </div>
                                            </div>

                                            <div className="max-w-xs space-y-2">
                                                <label className="text-xs font-medium text-zinc-300">Preferred Subtitle Language Code</label>
                                                <input
                                                    type="text"
                                                    value={settings.sub_lang}
                                                    onChange={(e) => setSettings({ ...settings, sub_lang: e.target.value })}
                                                    placeholder="en, es, ja..."
                                                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono select-text"
                                                />
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <SettingToggle
                                                    title="Embed Stream Metadata Tags"
                                                    description="Writes title, artist, upload date, and chapter markers into the output container."
                                                    checked={Boolean(settings.embed_metadata)}
                                                    onChange={(val) => setSettings({ ...settings, embed_metadata: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Embed High-Res Cover Art"
                                                    description=" attaches the stream thumbnail as cover art inside MP4, MKV, FLAC, and MP3 files."
                                                    checked={Boolean(settings.embed_thumbnail)}
                                                    onChange={(val) => setSettings({ ...settings, embed_thumbnail: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="EBU R128 -14 LUFS Loudness Normalization"
                                                    description="Runs an FFmpeg loudnorm filter pass so audio levels match broadcast streaming standards."
                                                    checked={Boolean(settings.normalize_audio)}
                                                    onChange={(val) => setSettings({ ...settings, normalize_audio: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Embed Subtitles by Default"
                                                    description="Automatically downloads and muxes matching closed captions into the video container."
                                                    checked={Boolean(settings.write_subs)}
                                                    onChange={(val) => setSettings({ ...settings, write_subs: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="FFmpeg Hardware Acceleration"
                                                    description="Uses hardware-accelerated encoding and ProRes 422 HQ profiles during post-processing."
                                                    checked={Boolean(settings.hw_accel)}
                                                    onChange={(val) => setSettings({ ...settings, hw_accel: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* SUB-TAB 4: IMAGE SCRAPER ENGINE */}
                                    {settingsSubTab === 'scraper' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-6`}
                                        >
                                            <div>
                                                <h2 className="text-sm font-semibold">Image Scraper & Pagination Engine</h2>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    Control how many high-res thumbnails render per page to eliminate UI lag, plus parallel batch threads.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Default Images Per Page</label>
                                                    <select
                                                        value={settings.image_page_size}
                                                        onChange={(e) => setSettings({ ...settings, image_page_size: Number(e.target.value) })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value={12}>12 Images / Page (Ultra Fast)</option>
                                                        <option value={24}>24 Images / Page (Recommended)</option>
                                                        <option value={48}>48 Images / Page</option>
                                                        <option value={96}>96 Images / Page</option>
                                                    </select>
                                                    <p className="text-[11px] text-zinc-500">
                                                        Keeps GPU memory usage low on massive 500+ image galleries.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Parallel Image Download Threads</label>
                                                    <select
                                                        value={settings.image_concurrency}
                                                        onChange={(e) => setSettings({ ...settings, image_concurrency: Number(e.target.value) })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value={1}>1x Sequential (Safe)</option>
                                                        <option value={2}>2x Parallel Workers</option>
                                                        <option value={4}>4x Parallel Workers (Recommended)</option>
                                                        <option value={8}>8x Parallel Workers (Maximum Speed)</option>
                                                    </select>
                                                    <p className="text-[11px] text-zinc-500">
                                                        Number of simultaneous full-res images downloaded at once.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Saved Image Naming Scheme</label>
                                                    <select
                                                        value={settings.image_naming_scheme}
                                                        onChange={(e) => setSettings({ ...settings, image_naming_scheme: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="indexed_original">Indexed Original (001_filename.jpg)</option>
                                                        <option value="original">Original Filename (filename.jpg)</option>
                                                        <option value="sequential">Clean Sequential (image_001.jpg)</option>
                                                    </select>
                                                    <p className="text-[11px] text-zinc-500">
                                                        Preserves album order on disk when browsing in Windows Explorer.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                                <SettingToggle
                                                    title="Create Dedicated Subfolder Per Scraped Gallery"
                                                    description="Saves each gallery inside /Image Vault/{Gallery Title}/ instead of mixing files together."
                                                    checked={Boolean(settings.image_subfolder_per_gallery)}
                                                    onChange={(val) => setSettings({ ...settings, image_subfolder_per_gallery: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                                <SettingToggle
                                                    title="Auto-Enable Thumbnail Referer Proxy"
                                                    description="Automatically routes thumbnail previews through Aura's backend proxy on hosts that block hotlinking."
                                                    checked={Boolean(settings.image_auto_proxy)}
                                                    onChange={(val) => setSettings({ ...settings, image_auto_proxy: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* SUB-TAB 5: NETWORK & ANTI-BOT */}
                                    {settingsSubTab === 'network' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-6`}
                                        >
                                            <div>
                                                <h2 className="text-sm font-semibold">Network Threads, Browser Cookies & Cloudflare Bypass</h2>
                                                <p className="text-xs text-zinc-400 mt-0.5">
                                                    Configure multi-threaded HLS fragment downloading, browser cookie inheritance, and proxy routing.
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Browser Cookie Session</label>
                                                    <select
                                                        value={settings.cookies_browser}
                                                        onChange={(e) => setSettings({ ...settings, cookies_browser: e.target.value })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value="none">None (Clean TLS Impersonation)</option>
                                                        <option value="firefox">Mozilla Firefox (Recommended)</option>
                                                        <option value="librewolf">LibreWolf</option>
                                                        <option value="edge">Microsoft Edge</option>
                                                        <option value="chrome">Google Chrome</option>
                                                        <option value="brave">Brave Browser</option>
                                                        <option value="vivaldi">Vivaldi</option>
                                                        <option value="opera">Opera</option>
                                                    </select>
                                                    <p className="text-[11px] text-zinc-500">
                                                        Inherits active login sessions for age-gated or member-only streams.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Concurrent Video Fragment Threads</label>
                                                    <select
                                                        value={settings.concurrent_fragments}
                                                        onChange={(e) => setSettings({ ...settings, concurrent_fragments: Number(e.target.value) })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value={1}>1 Thread (Sequential)</option>
                                                        <option value={4}>4 Threads</option>
                                                        <option value={8}>8 Threads (Recommended)</option>
                                                        <option value={16}>16 Threads (Maximum Bandwidth)</option>
                                                    </select>
                                                    <p className="text-[11px] text-zinc-500">
                                                        Accelerates DASH and HLS `.m3u8` segmented video streams.
                                                    </p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Network Fragment Retries</label>
                                                    <select
                                                        value={settings.network_retries}
                                                        onChange={(e) => setSettings({ ...settings, network_retries: Number(e.target.value) })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value={3}>3 Retries</option>
                                                        <option value={5}>5 Retries (Default)</option>
                                                        <option value={10}>10 Retries</option>
                                                        <option value={20}>20 Retries (Unstable Connections)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Socket Timeout</label>
                                                    <select
                                                        value={settings.socket_timeout}
                                                        onChange={(e) => setSettings({ ...settings, socket_timeout: Number(e.target.value) })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                    >
                                                        <option value={15}>15 Seconds (Fast Failover)</option>
                                                        <option value={30}>30 Seconds (Default)</option>
                                                        <option value={60}>60 Seconds (Slow Hosts)</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">Bandwidth Speed Limit (MB/s)</label>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.5"
                                                        value={settings.speed_limit_mb}
                                                        onChange={(e) => setSettings({ ...settings, speed_limit_mb: Number(e.target.value) })}
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono select-text"
                                                    />
                                                    <p className="text-[11px] text-zinc-500">Set to 0 for unlimited gigabit throughput.</p>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-xs font-medium text-zinc-300">HTTP / SOCKS5 Proxy URL</label>
                                                    <input
                                                        type="text"
                                                        value={settings.proxy_url}
                                                        onChange={(e) => setSettings({ ...settings, proxy_url: e.target.value })}
                                                        placeholder="socks5://127.0.0.1:1080"
                                                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono select-text"
                                                    />
                                                </div>
                                            </div>

                                            <div className="pt-2">
                                                <SettingToggle
                                                    title="Force IPv4 Network Routing"
                                                    description="Binds all outbound connections to 0.0.0.0 to prevent CDN IPv6 throttling or regional blocks."
                                                    checked={Boolean(settings.force_ipv4)}
                                                    onChange={(val) => setSettings({ ...settings, force_ipv4: val })}
                                                    accentPill={activeAccent.pill}
                                                />
                                            </div>
                                        </motion.div>
                                    )}

                                    {/* SUB-TAB 6: AUDIO CHIMES & SYSTEM DIAGNOSTICS */}
                                    {settingsSubTab === 'system' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="space-y-6"
                                        >
                                            {/* Audio Synthesizer Personalization */}
                                            <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-5`}>
                                                <div className="flex flex-wrap items-center justify-between gap-4">
                                                    <div>
                                                        <h2 className="text-sm font-semibold">Studio Audio Telemetry Synthesizer</h2>
                                                        <p className="text-xs text-zinc-400 mt-0.5">
                                                            Customize the Web Audio API chimes played when downloads queue, finish, or error.
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            playStudioSfx('complete', true, settings.sfx_style, settings.sfx_volume)
                                                        }
                                                        className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-medium flex items-center gap-2"
                                                    >
                                                        <Bell className="w-3.5 h-3.5 text-emerald-400" />
                                                        Test Sound
                                                    </button>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                                                    <SettingToggle
                                                        title="Enable Studio Audio Chimes"
                                                        description="Plays subtle synthesizer feedback on job completion."
                                                        checked={Boolean(settings.audio_sfx)}
                                                        onChange={(val) => setSettings({ ...settings, audio_sfx: val })}
                                                        accentPill={activeAccent.pill}
                                                    />

                                                    <div className="space-y-2">
                                                        <label className="text-xs font-medium text-zinc-300">Synthesizer Sound Profile</label>
                                                        <select
                                                            value={settings.sfx_style}
                                                            onChange={(e) => setSettings({ ...settings, sfx_style: e.target.value })}
                                                            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono"
                                                        >
                                                            <option value="chime">Harmonic Sine Chime (Default)</option>
                                                            <option value="synth">Warm Analog Triangle</option>
                                                            <option value="minimal">Minimal Studio Click</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <div className="flex justify-between text-xs">
                                                            <span className="text-zinc-300 font-medium">Chime Volume</span>
                                                            <span className="font-mono text-zinc-400">{settings.sfx_volume}%</span>
                                                        </div>
                                                        <input
                                                            type="range"
                                                            min="10"
                                                            max="100"
                                                            step="5"
                                                            value={settings.sfx_volume}
                                                            onChange={(e) => setSettings({ ...settings, sfx_volume: Number(e.target.value) })}
                                                            className="w-full accent-white cursor-pointer"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Engine Diagnostics Cards */}
                                            <div className={`${activeTheme.panel} border ${activeTheme.border} rounded-3xl p-7 space-y-5`}>
                                                <div>
                                                    <h2 className="text-sm font-semibold">Sidecar Engine & Binary Diagnostics</h2>
                                                    <p className="text-xs text-zinc-400 mt-0.5">
                                                        Live status of Aura's internal Python sidecar, FFmpeg pipeline, and anti-bot modules.
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                                                        <span className="text-[10px] font-mono text-zinc-500 uppercase">FFmpeg Pipeline</span>
                                                        <p className="font-mono text-xs text-emerald-400 font-semibold">
                                                            {sysInfo.ffmpeg_available ? 'Detected & Ready' : 'Missing in PATH'}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-zinc-500 truncate" title={sysInfo.ffmpeg_path}>
                                                            {sysInfo.ffmpeg_path}
                                                        </p>
                                                    </div>

                                                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                                                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Gallery-dl Engine</span>
                                                        <p className="font-mono text-xs text-emerald-400 font-semibold">
                                                            {sysInfo.gallery_dl_available ? 'Installed & Active' : 'HTML Fallback Mode'}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-zinc-500">Multi-site Image Scraper</p>
                                                    </div>

                                                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                                                        <span className="text-[10px] font-mono text-zinc-500 uppercase">Cloudflare Bypass</span>
                                                        <p className="font-mono text-xs text-emerald-400 font-semibold">
                                                            {sysInfo.curl_cffi_available ? 'curl_cffi + CDP Ready' : 'Standard HTTP'}
                                                        </p>
                                                        <p className="text-[10px] font-mono text-zinc-500">Chrome TLS Impersonation</p>
                                                    </div>

                                                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-[10px] font-mono text-zinc-500 uppercase">Archive Ledger</span>
                                                            <button
                                                                onClick={handleClearArchiveLedger}
                                                                className="text-[10px] font-mono text-red-400 hover:underline"
                                                            >
                                                                Clear Ledger
                                                            </button>
                                                        </div>
                                                        <p className="font-mono text-xs text-zinc-200 font-semibold">
                                                            {sysInfo.archive_count} Recorded IDs
                                                        </p>
                                                        <p className="text-[10px] font-mono text-zinc-500">Duplicate stream guard</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {/* Fullscreen Image Lightbox Modal with Keyboard Navigation & Selection */}
            <AnimatePresence>
                {activeLightboxItem && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setLightboxIndex(null)}
                        className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-6"
                    >
                        <div className="relative flex items-center justify-center max-w-[92vw] max-h-[80vh]" onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() =>
                                    setLightboxIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredGalleryImages.length - 1))
                                }
                                className="p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-white mr-4"
                                title="Previous Image (Left Arrow)"
                            >
                                <ChevronLeft className="w-5 h-5" />
                            </button>

                            <img
                                src={
                                    useProxyThumbnails
                                        ? `${API_BASE}/api/images/proxy?url=${encodeURIComponent(activeLightboxItem.url)}`
                                        : activeLightboxItem.url
                                }
                                alt={activeLightboxItem.title}
                                className="max-h-[80vh] max-w-[80vw] object-contain rounded-xl border border-zinc-800 shadow-2xl"
                            />

                            <button
                                onClick={() =>
                                    setLightboxIndex((prev) => (prev + 1 < filteredGalleryImages.length ? prev + 1 : 0))
                                }
                                className="p-2.5 rounded-full bg-zinc-900/90 hover:bg-zinc-800 border border-zinc-700 text-white ml-4"
                                title="Next Image (Right Arrow)"
                            >
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>

                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-4 flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-zinc-300"
                        >
                            <span className="text-zinc-400">
                                #{lightboxIndex + 1} / {filteredGalleryImages.length}
                            </span>
                            <span className="font-semibold text-white">{activeLightboxItem.title}</span>
                            {activeLightboxItem.width && activeLightboxItem.height && (
                                <span className="text-zinc-400">
                                    {activeLightboxItem.width}×{activeLightboxItem.height}
                                </span>
                            )}
                            <button
                                onClick={() => {
                                    const url = activeLightboxItem.url;
                                    setSelectedImageUrls((prev) =>
                                        prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
                                    );
                                }}
                                className={`px-3 py-1 rounded-lg font-sans font-medium transition ${selectedSet.has(activeLightboxItem.url)
                                        ? 'bg-emerald-500 text-zinc-950'
                                        : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                    }`}
                            >
                                {selectedSet.has(activeLightboxItem.url) ? 'Selected (Space)' : 'Select Image (Space)'}
                            </button>
                            <button
                                onClick={() => setLightboxIndex(null)}
                                className="px-3 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-sans"
                            >
                                Close (Esc)
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
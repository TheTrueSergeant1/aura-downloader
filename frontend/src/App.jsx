import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Download, Link2, Film, Music, Cpu, Scissors, Layers,
    AlertCircle, FolderOpen, Volume2, GripVertical, Zap,
    HardDrive, Clipboard, Sliders, Trash2, Check, Loader2,
    ShieldCheck, Terminal, Database, FileVideo, FileAudio,
    XCircle, RefreshCw, Subtitles, FastForward, Server,
    Cookie, FolderGit2, ArrowUpRight, Sun, Moon, Palette,
    ListChecks, RotateCcw, Search, Archive, Image as ImageIcon
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';
const WS_URL = 'ws://127.0.0.1:8000/ws';

const SPRING_SNAPPY = { type: 'spring', stiffness: 450, damping: 35, mass: 0.8 };
const SPRING_SOFT = { type: 'spring', stiffness: 300, damping: 28, mass: 1 };

const THEME_CYCLE = ['dark', 'light', 'oled', 'nord'];
const THEME_LABELS = {
    dark: 'Obsidian Dark',
    light: 'Daylight Studio',
    oled: 'OLED Zero Black',
    nord: 'Broadcast Slate',
};

const triggerSfx = (type, enabled = true) => {
    if (!enabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        const now = ctx.currentTime;
        if (type === 'sniff') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(540, now);
            osc.frequency.exponentialRampToValueAtTime(760, now + 0.06);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.start(now);
            osc.stop(now + 0.07);
        } else if (type === 'start') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(620, now + 0.09);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
        } else if (type === 'complete') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880, now + 0.08);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            osc.start(now);
            osc.stop(now + 0.25);
        }
    } catch {
        // Ignore WebView autoplay restrictions prior to user gesture
    }
};

export default function App() {
    const [activeTab, setActiveTab] = useState('capture');
    const [urlInput, setUrlInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedMedia, setAnalyzedMedia] = useState(null);
    const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);
    const [errorMsg, setErrorMsg] = useState('');

    // Per-job export controls
    const [mode, setMode] = useState('video'); // video | audio_flac | audio_mp3 | prores
    const [resolution, setResolution] = useState('2160');
    const [multithread, setMultithread] = useState(true);
    const [splitChapters, setSplitChapters] = useState(false);
    const [hwAccel, setHwAccel] = useState(true);
    const [embedMetadata, setEmbedMetadata] = useState(true);
    const [embedThumbnail, setEmbedThumbnail] = useState(true);
    const [writeSubs, setWriteSubs] = useState(false);
    const [normalizeAudio, setNormalizeAudio] = useState(false);
    const [useArchive, setUseArchive] = useState(false);
    const [sponsorblock, setSponsorblock] = useState('none');
    const [trimEnabled, setTrimEnabled] = useState(false);
    const [trimStart, setTrimStart] = useState('00:00');
    const [trimEnd, setTrimEnd] = useState('');

    // Queue, Vault, and System states
    const [queue, setQueue] = useState([]);
    const [vaultFiles, setVaultFiles] = useState([]);
    const [vaultSearch, setVaultSearch] = useState('');
    const [vaultExtFilter, setVaultExtFilter] = useState('ALL');
    const [loadingVault, setLoadingVault] = useState(false);
    const [systemInfo, setSystemInfo] = useState(null);
    const [wsConnected, setWsConnected] = useState(false);

    // Persistent App Settings
    const [settings, setSettings] = useState({
        theme: 'dark',
        download_dir: '',
        naming_template: 'standard',
        organizer_subfolder: false,
        concurrent_fragments: 8,
        speed_limit_mb: 0,
        cookies_browser: 'none',
        proxy_url: '',
        default_sponsorblock: 'none',
        embed_metadata: true,
        embed_thumbnail: true,
        write_subs: false,
        sub_lang: 'en',
        normalize_audio: false,
        use_archive: false,
        hw_accel: true,
        audio_sfx: true,
    });
    const [savingSettings, setSavingSettings] = useState(false);
    const [settingsSavedBadge, setSettingsSavedBadge] = useState(false);

    const soundRef = useRef(settings.audio_sfx);
    soundRef.current = settings.audio_sfx;

    const fetchSystemAndSettings = useCallback(async () => {
        try {
            const [sysRes, cfgRes] = await Promise.all([
                fetch(`${API_BASE}/api/system`),
                fetch(`${API_BASE}/api/settings`),
            ]);
            if (sysRes.ok) setSystemInfo(await sysRes.json());
            if (cfgRes.ok) {
                const cfg = await cfgRes.json();
                setSettings(cfg);
                setSponsorblock(cfg.default_sponsorblock || 'none');
                setEmbedMetadata(cfg.embed_metadata ?? true);
                setEmbedThumbnail(cfg.embed_thumbnail ?? true);
                setWriteSubs(cfg.write_subs ?? false);
                setNormalizeAudio(cfg.normalize_audio ?? false);
                setUseArchive(cfg.use_archive ?? false);
                setHwAccel(cfg.hw_accel ?? true);
            }
        } catch {
            // Engine still booting
        }
    }, []);

    const fetchVault = useCallback(async () => {
        setLoadingVault(true);
        try {
            const res = await fetch(`${API_BASE}/api/vault`);
            if (res.ok) setVaultFiles(await res.json());
        } catch {
            // Ignore
        } finally {
            setLoadingVault(false);
        }
    }, []);

    useEffect(() => {
        fetchSystemAndSettings();
    }, [fetchSystemAndSettings]);

    useEffect(() => {
        if (activeTab === 'vault') fetchVault();
        if (activeTab === 'settings') fetchSystemAndSettings();
    }, [activeTab, fetchVault, fetchSystemAndSettings]);

    // Real-time WebSocket stream
    useEffect(() => {
        let ws;
        let retryTimer;

        const connectWs = () => {
            ws = new WebSocket(WS_URL);
            ws.onopen = () => {
                setWsConnected(true);
                fetchSystemAndSettings();
            };
            ws.onmessage = (event) => {
                const incoming = JSON.parse(event.data);
                setQueue((prev) => {
                    const exists = prev.some((item) => item.id === incoming.id);
                    if (exists) {
                        return prev.map((item) => {
                            if (item.id === incoming.id) {
                                if (item.status !== 'completed' && incoming.status === 'completed') {
                                    triggerSfx('complete', soundRef.current);
                                    fetchSystemAndSettings();
                                }
                                return { ...item, ...incoming };
                            }
                            return item;
                        });
                    }
                    return [incoming, ...prev];
                });
            };
            ws.onclose = () => {
                setWsConnected(false);
                retryTimer = setTimeout(connectWs, 2000);
            };
        };

        connectWs();
        return () => {
            clearTimeout(retryTimer);
            if (ws) ws.close();
        };
    }, [fetchSystemAndSettings]);

    const formatDuration = (sec) => {
        if (!sec) return '00:00';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    const handleAnalyze = useCallback(async (targetUrl = urlInput) => {
        const cleanUrl = targetUrl.trim();
        if (!cleanUrl) return;
        setErrorMsg('');
        setIsAnalyzing(true);
        setAnalyzedMedia(null);

        try {
            const res = await fetch(`${API_BASE}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: cleanUrl }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Failed to parse stream URL');
            }
            const data = await res.json();
            setAnalyzedMedia(data);

            if (data.is_playlist && data.entries) {
                setSelectedPlaylistIds(data.entries.map((e) => e.id));
            } else {
                setTrimEnabled(false);
                setTrimStart('00:00');
                setTrimEnd(formatDuration(data.duration));
                if (data.stream_tiers?.length > 0) {
                    setResolution(String(data.stream_tiers[0].height));
                }
            }
            triggerSfx('sniff', settings.audio_sfx);
        } catch (err) {
            setErrorMsg(err.message || 'Local media engine unreachable.');
        } finally {
            setIsAnalyzing(false);
        }
    }, [urlInput, settings.audio_sfx]);

    // Global Ctrl+V shortcut when on Ingest tab
    useEffect(() => {
        const onPaste = (e) => {
            if (activeTab !== 'capture') return;
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
            const pasted = e.clipboardData?.getData('text');
            if (pasted && (pasted.startsWith('http://') || pasted.startsWith('https://'))) {
                setUrlInput(pasted);
                handleAnalyze(pasted);
            }
        };
        window.addEventListener('paste', onPaste);
        return () => window.removeEventListener('paste', onPaste);
    }, [activeTab, handleAnalyze]);

    const handleClipboardSniff = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                setUrlInput(text);
                handleAnalyze(text);
            } else {
                setErrorMsg('Clipboard does not contain a valid HTTP/HTTPS stream URL.');
            }
        } catch {
            setErrorMsg('Clipboard access denied.');
        }
    };

    const handleStartDownload = async () => {
        if (!analyzedMedia) return;
        triggerSfx('start', settings.audio_sfx);

        try {
            if (analyzedMedia.is_playlist) {
                const chosenEntries = (analyzedMedia.entries || []).filter((e) =>
                    selectedPlaylistIds.includes(e.id)
                );
                if (chosenEntries.length === 0) return;

                const batchItems = chosenEntries.map((entry) => ({
                    url: entry.url,
                    title: entry.title,
                    uploader: entry.uploader,
                    thumbnail: entry.thumbnail,
                    mode,
                    resolution,
                    multithread,
                    split_chapters: false,
                    hw_accel: hwAccel,
                    embed_metadata: embedMetadata,
                    embed_thumbnail: embedThumbnail,
                    write_subs: writeSubs,
                    normalize_audio: normalizeAudio,
                    use_archive: useArchive,
                    sponsorblock,
                    trim_enabled: false,
                }));

                await fetch(`${API_BASE}/api/download-batch`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: batchItems }),
                });
            } else {
                await fetch(`${API_BASE}/api/download`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        url: analyzedMedia.webpage_url || urlInput,
                        title: analyzedMedia.title,
                        uploader: analyzedMedia.uploader,
                        thumbnail: analyzedMedia.thumbnail,
                        mode,
                        resolution,
                        multithread,
                        split_chapters: splitChapters,
                        hw_accel: hwAccel,
                        embed_metadata: embedMetadata,
                        embed_thumbnail: embedThumbnail,
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
            setAnalyzedMedia(null);
            setUrlInput('');
            setActiveTab('queue');
        } catch {
            setErrorMsg('Failed to dispatch job to backend engine.');
        }
    };

    const handleCancelJob = async (jobId) => {
        await fetch(`${API_BASE}/api/cancel/${jobId}`, { method: 'POST' });
    };

    const handleRetryJob = async (jobId) => {
        triggerSfx('start', settings.audio_sfx);
        await fetch(`${API_BASE}/api/retry/${jobId}`, { method: 'POST' });
    };

    const handleOpenFolder = async (specificPath = null) => {
        await fetch(`${API_BASE}/api/open-folder${specificPath ? `?path=${encodeURIComponent(specificPath)}` : ''}`, {
            method: 'POST',
        });
    };

    const handlePickNativeFolder = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/pick-folder`, { method: 'POST' });
            if (res.ok) {
                const data = await res.json();
                if (data.path) {
                    const updated = { ...settings, download_dir: data.path };
                    setSettings(updated);
                    handleSaveSettings(updated);
                }
            }
        } catch {
            // Ignore
        }
    };

    const handleClearArchive = async () => {
        const res = await fetch(`${API_BASE}/api/archive/clear`, { method: 'POST' });
        if (res.ok) fetchSystemAndSettings();
    };

    const handleDeleteVaultFile = async (filePath) => {
        const res = await fetch(`${API_BASE}/api/vault?path=${encodeURIComponent(filePath)}`, {
            method: 'DELETE',
        });
        if (res.ok) {
            setVaultFiles((prev) => prev.filter((f) => f.path !== filePath));
            fetchSystemAndSettings();
        }
    };

    const handleSaveSettings = async (updated = settings) => {
        setSavingSettings(true);
        try {
            const res = await fetch(`${API_BASE}/api/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updated),
            });
            if (res.ok) {
                const saved = await res.json();
                setSettings(saved);
                setSettingsSavedBadge(true);
                setTimeout(() => setSettingsSavedBadge(false), 2000);
                fetchSystemAndSettings();
            }
        } finally {
            setSavingSettings(false);
        }
    };

    const cycleTheme = () => {
        const currentIdx = THEME_CYCLE.indexOf(settings.theme || 'dark');
        const nextTheme = THEME_CYCLE[(currentIdx + 1) % THEME_CYCLE.length];
        const updated = { ...settings, theme: nextTheme };
        setSettings(updated);
        handleSaveSettings(updated);
    };

    const togglePlaylistEntry = (id) => {
        setSelectedPlaylistIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    const activeDownloads = queue.filter(
        (q) => q.status === 'downloading' || q.status === 'starting' || q.status === 'processing'
    );
    const totalSpeed = activeDownloads.reduce((acc, item) => acc + (item.speed_mb || 0), 0).toFixed(2);
    const avgProgress = activeDownloads.length
        ? Math.round(activeDownloads.reduce((acc, item) => acc + (item.percent || 0), 0) / activeDownloads.length)
        : 0;

    const filteredVault = vaultFiles.filter((file) => {
        const matchesSearch = file.rel_path.toLowerCase().includes(vaultSearch.toLowerCase());
        const matchesExt = vaultExtFilter === 'ALL' || file.ext === vaultExtFilter;
        return matchesSearch && matchesExt;
    });

    return (
        <div
            data-theme={settings.theme || 'dark'}
            className="w-screen h-screen overflow-hidden bg-[#09090B] text-zinc-100 flex select-none font-sans antialiased transition-colors duration-200"
        >
            {/* ================= LEFT STUDIO NAVIGATION RAIL ================= */}
            <aside className="w-60 h-full bg-[#0C0C0F] border-r border-zinc-800/80 flex flex-col justify-between p-4 shrink-0">
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2 pt-1">
                        <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-950 flex items-center justify-center font-bold text-xs tracking-tighter shadow-sm">
                                AU
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold tracking-tight text-zinc-100">Aura Studio</span>
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                                        v1.3
                                    </span>
                                </div>
                                <p className="text-[11px] text-zinc-500">Media Ingest & Archiver</p>
                            </div>
                        </div>
                    </div>

                    <nav className="space-y-1">
                        {[
                            { id: 'capture', label: 'Ingest Studio', icon: Terminal },
                            { id: 'queue', label: 'Transfer Queue', icon: Layers, badge: activeDownloads.length || queue.length },
                            { id: 'vault', label: 'Media Vault', icon: Database, badge: vaultFiles.length || null },
                            { id: 'settings', label: 'Preferences', icon: Sliders },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-pill"
                                            transition={SPRING_SNAPPY}
                                            className="absolute inset-0 bg-zinc-800/90 border border-zinc-700/70 rounded-lg"
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-2.5">
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </span>
                                    {tab.badge > 0 && (
                                        <span
                                            className={`relative z-10 text-[11px] font-mono px-1.5 py-0.5 rounded ${tab.id === 'queue' && activeDownloads.length > 0
                                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                                    : 'bg-zinc-800 text-zinc-400'
                                                }`}
                                        >
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Bottom Storage & Telemetry Box */}
                <div className="space-y-3 pt-4 border-t border-zinc-800/80">
                    {systemInfo && (
                        <div className="px-2.5 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/80 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                                <span className="text-zinc-500 flex items-center gap-1.5">
                                    <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                                    Target Drive
                                </span>
                                <span className="font-mono text-zinc-300">{systemInfo.disk_free_gb} GB free</span>
                            </div>
                            <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-zinc-400 rounded-full"
                                    style={{
                                        width: `${Math.min(
                                            100,
                                            Math.max(5, 100 - (systemInfo.disk_free_gb / (systemInfo.disk_total_gb || 1)) * 100)
                                        )}%`,
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => handleOpenFolder()}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800/80 border border-zinc-800 text-xs font-medium text-zinc-300 transition"
                    >
                        <span className="flex items-center gap-2">
                            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
                            Open Output Directory
                        </span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-zinc-500" />
                    </button>
                </div>
            </aside>

            {/* ================= MAIN WORKSPACE AREA ================= */}
            <div className="flex-1 h-full flex flex-col overflow-hidden">
                {/* Top Precision Telemetry Bar */}
                <header className="h-13 border-b border-zinc-800/80 bg-[#0C0C0F]/80 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3 text-xs">
                        <span className="text-zinc-500">Workspace</span>
                        <span className="text-zinc-700">/</span>
                        <span className="font-medium text-zinc-200 capitalize">
                            {activeTab === 'capture' ? 'Stream Ingest Studio' : activeTab}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Quick Theme Switcher Pill */}
                        <button
                            onClick={cycleTheme}
                            title="Cycle Studio Theme"
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 transition"
                        >
                            {settings.theme === 'light' ? (
                                <Sun className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                                <Moon className="w-3.5 h-3.5 text-zinc-400" />
                            )}
                            <span>{THEME_LABELS[settings.theme || 'dark']}</span>
                        </button>

                        {/* Live Engine Telemetry Pill */}
                        <div className="flex items-center gap-2.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs">
                            {isAnalyzing ? (
                                <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                            ) : activeDownloads.length > 0 ? (
                                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                            ) : (
                                <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-400' : 'bg-red-500'}`} />
                            )}

                            <span className="text-zinc-300 font-medium">
                                {isAnalyzing
                                    ? 'Probing Stream...'
                                    : activeDownloads.length > 0
                                        ? `${activeDownloads.length} Active (${avgProgress}%)`
                                        : wsConnected
                                            ? 'Engine Online'
                                            : 'Engine Offline'}
                            </span>

                            {activeDownloads.length > 0 && (
                                <>
                                    <span className="text-zinc-700">|</span>
                                    <span className="font-mono text-blue-400">{totalSpeed} MB/s</span>
                                </>
                            )}
                        </div>

                        {systemInfo && (
                            <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-zinc-500">
                                <span>yt-dlp {systemInfo.yt_dlp_version}</span>
                                <span>·</span>
                                <span className={systemInfo.ffmpeg_available ? 'text-emerald-400/80' : 'text-amber-400'}>
                                    {systemInfo.ffmpeg_available ? 'FFmpeg Ready' : 'FFmpeg Missing'}
                                </span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Scrollable Content View */}
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-4xl mx-auto">
                        <AnimatePresence mode="wait">
                            {/* ---------------- TAB 1: INGEST STUDIO ---------------- */}
                            {activeTab === 'capture' && (
                                <motion.div
                                    key="capture"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={SPRING_SNAPPY}
                                    className="space-y-6"
                                >
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
                                                Stream Ingest & Format Inspector
                                            </h1>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                Inspect codecs, batch-queue playlists, slice timecodes, or run multi-threaded extractions.
                                            </p>
                                        </div>
                                        <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-1 rounded">
                                            Press <kbd className="text-zinc-300">Ctrl+V</kbd> anywhere to paste & probe
                                        </span>
                                    </div>

                                    {/* URL Command Input Bar */}
                                    <div className="flex items-center bg-[#121216] border border-zinc-800 focus-within:border-zinc-600 rounded-xl p-1.5 shadow-inner transition">
                                        <div className="pl-3 pr-2.5 text-zinc-500">
                                            <Link2 className="w-4 h-4" />
                                        </div>
                                        <input
                                            type="text"
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                            placeholder="Paste single stream or playlist URL (YouTube, Twitch VOD, Vimeo, X...)"
                                            className="flex-1 bg-transparent text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none select-text"
                                        />
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={handleClipboardSniff}
                                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 text-xs font-medium text-zinc-300 transition"
                                            >
                                                <Clipboard className="w-3.5 h-3.5 text-zinc-400" />
                                                Paste
                                            </button>
                                            <button
                                                disabled={isAnalyzing || !urlInput.trim()}
                                                onClick={() => handleAnalyze()}
                                                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white disabled:opacity-40 text-xs font-semibold text-zinc-950 transition"
                                            >
                                                {isAnalyzing ? (
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                ) : (
                                                    <Terminal className="w-3.5 h-3.5" />
                                                )}
                                                {isAnalyzing ? 'Probing...' : 'Inspect Stream'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Error Banner */}
                                    <AnimatePresence>
                                        {errorMsg && (
                                            <motion.div
                                                initial={{ opacity: 0, y: -4 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -4 }}
                                                className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-950/40 border border-red-900/60 text-red-200 text-xs"
                                            >
                                                <div className="flex items-center gap-2.5">
                                                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                                    <span className="font-mono">{errorMsg}</span>
                                                </div>
                                                <button onClick={() => setErrorMsg('')} className="text-red-400 hover:text-red-200">
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* ================= PLAYLIST BATCH PICKER PANEL ================= */}
                                    <AnimatePresence>
                                        {analyzedMedia && analyzedMedia.is_playlist && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                transition={SPRING_SNAPPY}
                                                className="bg-[#111115] border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl"
                                            >
                                                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 text-[10px] font-mono uppercase">
                                                                Playlist Detected
                                                            </span>
                                                            <span className="text-xs font-mono text-zinc-400">
                                                                {selectedPlaylistIds.length} of {analyzedMedia.entries?.length || 0} selected
                                                            </span>
                                                        </div>
                                                        <h2 className="text-base font-semibold text-zinc-100 mt-1">{analyzedMedia.title}</h2>
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() =>
                                                                setSelectedPlaylistIds((analyzedMedia.entries || []).map((e) => e.id))
                                                            }
                                                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                        >
                                                            Select All
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedPlaylistIds([])}
                                                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                        >
                                                            None
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setSelectedPlaylistIds((prev) =>
                                                                    (analyzedMedia.entries || [])
                                                                        .map((e) => e.id)
                                                                        .filter((id) => !prev.includes(id))
                                                                )
                                                            }
                                                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300"
                                                        >
                                                            Invert
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Format Profile Row for Batch Playlist */}
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                    {[
                                                        { id: 'video', label: 'MP4 Video', sub: `Max ${resolution}p`, icon: Film },
                                                        { id: 'prores', label: 'ProRes 422', sub: 'Edit Ready (.mov)', icon: Cpu },
                                                        { id: 'audio_flac', label: 'FLAC Lossless', sub: 'Studio Audio', icon: Music },
                                                        { id: 'audio_mp3', label: 'MP3 320kbps', sub: 'Compact Audio', icon: FileAudio },
                                                    ].map((item) => {
                                                        const Icon = item.icon;
                                                        const active = mode === item.id;
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                onClick={() => setMode(item.id)}
                                                                className={`p-2.5 rounded-xl border text-left transition ${active
                                                                        ? 'bg-zinc-800/90 border-zinc-500 text-zinc-100'
                                                                        : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                                    <Icon className="w-3.5 h-3.5" />
                                                                    {item.label}
                                                                </div>
                                                                <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{item.sub}</div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                {/* Scrollable Playlist Checklist */}
                                                <div className="max-h-72 overflow-y-auto border border-zinc-800/90 rounded-xl divide-y divide-zinc-800/60 bg-zinc-950/50">
                                                    {(analyzedMedia.entries || []).map((entry) => {
                                                        const checked = selectedPlaylistIds.includes(entry.id);
                                                        return (
                                                            <div
                                                                key={entry.id}
                                                                onClick={() => togglePlaylistEntry(entry.id)}
                                                                className={`px-3.5 py-2.5 flex items-center justify-between gap-3 cursor-pointer transition ${checked ? 'bg-zinc-900/70' : 'opacity-60 hover:opacity-90'
                                                                    }`}
                                                            >
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <div
                                                                        className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${checked ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-700'
                                                                            }`}
                                                                    >
                                                                        {checked && <Check className="w-3 h-3 stroke-[3]" />}
                                                                    </div>
                                                                    <span className="text-[11px] font-mono text-zinc-500 w-6">
                                                                        #{entry.index}
                                                                    </span>
                                                                    {entry.thumbnail && (
                                                                        <img
                                                                            src={entry.thumbnail}
                                                                            alt=""
                                                                            className="w-12 h-7 object-cover rounded border border-zinc-800 shrink-0"
                                                                        />
                                                                    )}
                                                                    <span className="text-xs font-medium text-zinc-200 truncate">
                                                                        {entry.title}
                                                                    </span>
                                                                </div>
                                                                <span className="text-[11px] font-mono text-zinc-500 shrink-0">
                                                                    {formatDuration(entry.duration)}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    disabled={selectedPlaylistIds.length === 0}
                                                    onClick={handleStartDownload}
                                                    className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white disabled:opacity-40 text-zinc-950 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition"
                                                >
                                                    <ListChecks className="w-4 h-4" />
                                                    Batch Queue {selectedPlaylistIds.length} Selected Streams
                                                </button>
                                            </motion.div>
                                        )}

                                        {/* ================= SINGLE STREAM INSPECTOR PANEL ================= */}
                                        {analyzedMedia && !analyzedMedia.is_playlist && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 12 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 8 }}
                                                transition={SPRING_SNAPPY}
                                                className="bg-[#111115] border border-zinc-800 rounded-2xl p-6 space-y-6 shadow-2xl"
                                            >
                                                {/* Top Metadata Header */}
                                                <div className="flex flex-col md:flex-row gap-5 items-start">
                                                    <div className="relative group w-full md:w-60 aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800 shrink-0">
                                                        {analyzedMedia.thumbnail && (
                                                            <img
                                                                src={analyzedMedia.thumbnail}
                                                                alt=""
                                                                className="w-full h-full object-cover"
                                                            />
                                                        )}
                                                        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/85 border border-white/10 text-[11px] font-mono text-zinc-100">
                                                            {formatDuration(analyzedMedia.duration)}
                                                        </div>
                                                        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
                                                            {analyzedMedia.extractor}
                                                        </div>
                                                        {analyzedMedia.thumbnail && (
                                                            <a
                                                                href={analyzedMedia.thumbnail}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                title="Open High-Res Source Thumbnail"
                                                                className="opacity-0 group-hover:opacity-100 absolute top-2 right-2 p-1.5 rounded-lg bg-black/80 text-zinc-200 hover:text-white transition"
                                                            >
                                                                <ImageIcon className="w-3.5 h-3.5" />
                                                            </a>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0 space-y-3">
                                                        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                                                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                                                                {analyzedMedia.uploader}
                                                            </span>
                                                            {analyzedMedia.id && (
                                                                <span className="px-2 py-0.5 rounded bg-zinc-900 text-zinc-500 border border-zinc-800">
                                                                    ID: {analyzedMedia.id}
                                                                </span>
                                                            )}
                                                            {analyzedMedia.chapters?.length > 0 && (
                                                                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/25">
                                                                    {analyzedMedia.chapters.length} Chapters
                                                                </span>
                                                            )}
                                                            {analyzedMedia.has_subtitles && (
                                                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                                                                    Subtitles Available
                                                                </span>
                                                            )}
                                                        </div>

                                                        <h2 className="text-base font-semibold text-zinc-100 leading-snug">
                                                            {analyzedMedia.title}
                                                        </h2>

                                                        {/* Container / Codec Profile Selector */}
                                                        <div className="pt-1">
                                                            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block mb-1.5">
                                                                Output Container & Transcode Profile
                                                            </label>
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                                {[
                                                                    { id: 'video', label: 'MP4 Master', sub: 'H.264 / VP9 / AV1', icon: Film },
                                                                    { id: 'prores', label: 'ProRes 422', sub: 'NLE Edit Ready (.mov)', icon: Cpu },
                                                                    { id: 'audio_flac', label: 'FLAC Lossless', sub: '24-bit Studio Audio', icon: Music },
                                                                    { id: 'audio_mp3', label: 'MP3 320kbps', sub: 'Universal Audio', icon: FileAudio },
                                                                ].map((item) => {
                                                                    const Icon = item.icon;
                                                                    const active = mode === item.id;
                                                                    return (
                                                                        <button
                                                                            key={item.id}
                                                                            onClick={() => setMode(item.id)}
                                                                            className={`p-2.5 rounded-xl border text-left transition ${active
                                                                                    ? 'bg-zinc-800/90 border-zinc-500 text-zinc-100'
                                                                                    : 'bg-zinc-900/40 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900'
                                                                                }`}
                                                                        >
                                                                            <div className="flex items-center gap-1.5 text-xs font-semibold">
                                                                                <Icon className="w-3.5 h-3.5 text-zinc-300" />
                                                                                {item.label}
                                                                            </div>
                                                                            <div className="text-[10px] font-mono text-zinc-500 mt-0.5">{item.sub}</div>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Dynamic Probed Resolution & Codec Matrix */}
                                                {mode === 'video' && (
                                                    <div className="space-y-2 pt-4 border-t border-zinc-800/80">
                                                        <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 block">
                                                            Available Video Streams (Probed from Source)
                                                        </label>
                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                                            {(analyzedMedia.stream_tiers?.length > 0
                                                                ? analyzedMedia.stream_tiers
                                                                : [
                                                                    { height: 2160, fps: 60, vcodec: 'VP9/AV1', dynamic_range: 'HDR' },
                                                                    { height: 1440, fps: 60, vcodec: 'VP9', dynamic_range: 'SDR' },
                                                                    { height: 1080, fps: 60, vcodec: 'AVC1', dynamic_range: 'SDR' },
                                                                    { height: 720, fps: 30, vcodec: 'AVC1', dynamic_range: 'SDR' },
                                                                ]
                                                            ).map((tier) => {
                                                                const val = String(tier.height);
                                                                const isSelected = resolution === val;
                                                                return (
                                                                    <button
                                                                        key={val}
                                                                        onClick={() => setResolution(val)}
                                                                        className={`p-3 rounded-xl border text-left transition ${isSelected
                                                                                ? 'bg-blue-500/10 border-blue-500/60 text-zinc-100'
                                                                                : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:bg-zinc-900'
                                                                            }`}
                                                                    >
                                                                        <div className="flex items-center justify-between">
                                                                            <span className="text-xs font-bold font-mono">{tier.height}p</span>
                                                                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-300">
                                                                                {tier.fps}fps
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-500 mt-1">
                                                                            <span>{tier.vcodec}</span>
                                                                            <span>{tier.size_mb ? `~${tier.size_mb} MB` : tier.dynamic_range}</span>
                                                                        </div>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Interactive Chapter Quick-Select Pills (populates Sub-Clip Trimmer) */}
                                                {analyzedMedia.chapters?.length > 0 && (
                                                    <div className="space-y-2 pt-4 border-t border-zinc-800/80">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-500">
                                                                Source Chapters (Click any chapter to load into Sub-Clip Trimmer)
                                                            </label>
                                                        </div>
                                                        <div className="flex gap-1.5 overflow-x-auto pb-1.5">
                                                            {analyzedMedia.chapters.map((ch, idx) => (
                                                                <button
                                                                    key={idx}
                                                                    onClick={() => {
                                                                        setTrimEnabled(true);
                                                                        setTrimStart(formatDuration(ch.start_time));
                                                                        setTrimEnd(formatDuration(ch.end_time));
                                                                    }}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left shrink-0 transition"
                                                                >
                                                                    <div className="text-xs font-medium text-zinc-200 max-w-[180px] truncate">
                                                                        {ch.title}
                                                                    </div>
                                                                    <div className="text-[10px] font-mono text-zinc-500">
                                                                        {formatDuration(ch.start_time)} – {formatDuration(ch.end_time)}
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Sub-Clip Timecode Trimmer & SponsorBlock Bar */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-zinc-800/80">
                                                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-medium flex items-center gap-2 text-zinc-200">
                                                                <Scissors className="w-3.5 h-3.5 text-zinc-400" />
                                                                Timecode Sub-Clip Extraction
                                                            </span>
                                                            <button
                                                                onClick={() => setTrimEnabled(!trimEnabled)}
                                                                className={`px-2 py-0.5 rounded text-[11px] font-mono transition ${trimEnabled
                                                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                                                        : 'bg-zinc-800 text-zinc-400'
                                                                    }`}
                                                            >
                                                                {trimEnabled ? 'Active' : 'Full Stream'}
                                                            </button>
                                                        </div>
                                                        {trimEnabled ? (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1">
                                                                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">IN POINT</span>
                                                                    <input
                                                                        type="text"
                                                                        value={trimStart}
                                                                        onChange={(e) => setTrimStart(e.target.value)}
                                                                        placeholder="00:00"
                                                                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-100 select-text"
                                                                    />
                                                                </div>
                                                                <span className="text-zinc-600 pt-4">→</span>
                                                                <div className="flex-1">
                                                                    <span className="text-[10px] font-mono text-zinc-500 block mb-1">OUT POINT</span>
                                                                    <input
                                                                        type="text"
                                                                        value={trimEnd}
                                                                        onChange={(e) => setTrimEnd(e.target.value)}
                                                                        placeholder="03:45"
                                                                        className="w-full px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs font-mono text-zinc-100 select-text"
                                                                    />
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <p className="text-[11px] text-zinc-500">
                                                                Cut a specific timestamp range without downloading the entire VOD.
                                                            </p>
                                                        )}
                                                    </div>

                                                    {/* SponsorBlock Filter */}
                                                    <div className="p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/90 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <span className="text-xs font-medium flex items-center gap-2 text-zinc-200">
                                                                <FastForward className="w-3.5 h-3.5 text-zinc-400" />
                                                                SponsorBlock Segment Filter
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1.5">
                                                            {[
                                                                { id: 'none', label: 'Keep All' },
                                                                { id: 'remove', label: 'Cut Sponsors' },
                                                                { id: 'mark', label: 'Mark Chapters' },
                                                            ].map((sb) => (
                                                                <button
                                                                    key={sb.id}
                                                                    onClick={() => setSponsorblock(sb.id)}
                                                                    className={`py-1.5 px-2 rounded-lg text-xs font-medium border transition ${sponsorblock === sb.id
                                                                            ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                                                                            : 'bg-zinc-950/60 border-zinc-800/80 text-zinc-500 hover:text-zinc-300'
                                                                        }`}
                                                                >
                                                                    {sb.label}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Pipeline Toggles (6 Studio Switches) */}
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2">
                                                    {[
                                                        {
                                                            label: `${settings.concurrent_fragments}x Fragment Threads`,
                                                            state: multithread,
                                                            setter: setMultithread,
                                                            icon: Zap,
                                                        },
                                                        {
                                                            label: 'Loudness Norm (-14 LUFS)',
                                                            state: normalizeAudio,
                                                            setter: setNormalizeAudio,
                                                            icon: Volume2,
                                                        },
                                                        {
                                                            label: 'Embed Subtitles (.srt)',
                                                            state: writeSubs,
                                                            setter: setWriteSubs,
                                                            icon: Subtitles,
                                                        },
                                                        {
                                                            label: 'Split by Chapters',
                                                            state: splitChapters,
                                                            setter: setSplitChapters,
                                                            icon: Scissors,
                                                        },
                                                        {
                                                            label: 'Embed Tags & Cover Art',
                                                            state: embedMetadata,
                                                            setter: setEmbedMetadata,
                                                            icon: ShieldCheck,
                                                        },
                                                        {
                                                            label: 'Log in Duplicate Archive',
                                                            state: useArchive,
                                                            setter: setUseArchive,
                                                            icon: Archive,
                                                        },
                                                    ].map((toggle) => {
                                                        const Icon = toggle.icon;
                                                        return (
                                                            <button
                                                                key={toggle.label}
                                                                onClick={() => toggle.setter(!toggle.state)}
                                                                className={`px-3 py-2.5 rounded-xl border text-left transition flex items-center justify-between ${toggle.state
                                                                        ? 'bg-zinc-800/80 border-zinc-600 text-zinc-100'
                                                                        : 'bg-zinc-900/30 border-zinc-800/80 text-zinc-500'
                                                                    }`}
                                                            >
                                                                <span className="flex items-center gap-2 text-xs font-medium truncate pr-2">
                                                                    <Icon className="w-3.5 h-3.5 shrink-0" />
                                                                    <span className="truncate">{toggle.label}</span>
                                                                </span>
                                                                <div
                                                                    className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 ${toggle.state ? 'bg-zinc-100 text-zinc-950' : 'border border-zinc-700'
                                                                        }`}
                                                                >
                                                                    {toggle.state && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <button
                                                    onClick={handleStartDownload}
                                                    className="w-full py-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition shadow-sm"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    Dispatch Job to Transfer Queue
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}

                            {/* ---------------- TAB 2: TRANSFER QUEUE ---------------- */}
                            {activeTab === 'queue' && (
                                <motion.div
                                    key="queue"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={SPRING_SNAPPY}
                                    className="space-y-5"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Active & Recent Transfers</h1>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                Real-time byte stream telemetry, FFmpeg muxing state, and queue ordering.
                                            </p>
                                        </div>
                                        {queue.length > 0 && (
                                            <button
                                                onClick={() =>
                                                    setQueue((prev) =>
                                                        prev.filter((i) => i.status === 'downloading' || i.status === 'processing')
                                                    )
                                                }
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-400 transition"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                Purge Finished
                                            </button>
                                        )}
                                    </div>

                                    {queue.length === 0 ? (
                                        <div className="bg-[#111115] border border-zinc-800/80 rounded-2xl p-14 text-center space-y-2">
                                            <Layers className="w-7 h-7 text-zinc-600 mx-auto" />
                                            <p className="text-xs font-medium text-zinc-400">No active or queued jobs</p>
                                            <p className="text-[11px] text-zinc-600">
                                                Paste a stream link in the Ingest Studio to begin.
                                            </p>
                                        </div>
                                    ) : (
                                        <Reorder.Group axis="y" values={queue} onReorder={setQueue} className="space-y-2.5">
                                            {queue.map((item) => (
                                                <Reorder.Item
                                                    key={item.id}
                                                    value={item}
                                                    transition={SPRING_SOFT}
                                                    className="bg-[#111115] border border-zinc-800 rounded-xl p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing"
                                                >
                                                    <GripVertical className="w-4 h-4 text-zinc-600 shrink-0" />

                                                    {item.thumbnail && (
                                                        <img
                                                            src={item.thumbnail}
                                                            alt=""
                                                            className="w-20 h-12 object-cover rounded-lg border border-zinc-800 shrink-0"
                                                        />
                                                    )}

                                                    <div className="flex-1 min-w-0 space-y-2">
                                                        <div className="flex items-center justify-between gap-4">
                                                            <div className="truncate">
                                                                <p className="text-xs font-semibold truncate text-zinc-100">{item.title}</p>
                                                                {item.error ? (
                                                                    <p className="text-[11px] font-mono text-red-400 truncate">{item.error}</p>
                                                                ) : (
                                                                    item.uploader && (
                                                                        <p className="text-[11px] text-zinc-500 truncate">{item.uploader}</p>
                                                                    )
                                                                )}
                                                            </div>
                                                            <span
                                                                className={`text-[11px] font-mono px-2 py-0.5 rounded shrink-0 ${item.status === 'completed'
                                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                                        : item.status === 'processing'
                                                                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                                                                            : item.status === 'error' || item.status === 'cancelled'
                                                                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                                                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                                    }`}
                                                            >
                                                                {item.status === 'completed'
                                                                    ? 'COMPLETED'
                                                                    : item.status === 'processing'
                                                                        ? 'FFMPEG MUXING'
                                                                        : item.status === 'cancelled'
                                                                            ? 'ABORTED'
                                                                            : item.status === 'error'
                                                                                ? 'FAILED'
                                                                                : `${item.percent}%`}
                                                            </span>
                                                        </div>

                                                        <div className="w-full h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                                                            <motion.div
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${item.percent || 0}%` }}
                                                                transition={{ ease: 'easeOut', duration: 0.2 }}
                                                                className={`h-full ${item.status === 'completed'
                                                                        ? 'bg-emerald-400'
                                                                        : item.status === 'error' || item.status === 'cancelled'
                                                                            ? 'bg-red-500'
                                                                            : 'bg-zinc-200'
                                                                    }`}
                                                            />
                                                        </div>

                                                        <div className="flex items-center gap-4 text-[11px] text-zinc-500 font-mono">
                                                            <span>SPEED: {item.speed_mb || '0.00'} MB/s</span>
                                                            <span>ETA: {item.eta ? `${item.eta}s` : '--'}</span>
                                                            {item.size_mb > 0 && (
                                                                <span>
                                                                    SIZE: {item.downloaded_mb || 0} / {item.size_mb} MB
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Contextual Action Buttons */}
                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        {(item.status === 'downloading' || item.status === 'starting') && (
                                                            <button
                                                                onClick={() => handleCancelJob(item.id)}
                                                                className="p-2 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-800/60 text-zinc-400 hover:text-red-300 transition"
                                                                title="Abort Download"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {(item.status === 'error' || item.status === 'cancelled') && (
                                                            <button
                                                                onClick={() => handleRetryJob(item.id)}
                                                                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 transition"
                                                                title="Retry Job"
                                                            >
                                                                <RotateCcw className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        {item.status === 'completed' && (
                                                            <button
                                                                onClick={() => handleOpenFolder()}
                                                                className="p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-emerald-400 transition"
                                                                title="Open Output Folder"
                                                            >
                                                                <FolderOpen className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </Reorder.Item>
                                            ))}
                                        </Reorder.Group>
                                    )}
                                </motion.div>
                            )}

                            {/* ---------------- TAB 3: MEDIA VAULT (DISK BROWSER) ---------------- */}
                            {activeTab === 'vault' && (
                                <motion.div
                                    key="vault"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={SPRING_SNAPPY}
                                    className="space-y-5"
                                >
                                    <div className="flex flex-wrap items-center justify-between gap-4">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Local Media Vault</h1>
                                            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                                                {settings.download_dir || 'Scanning output directory...'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={fetchVault}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition"
                                            >
                                                <RefreshCw className={`w-3.5 h-3.5 ${loadingVault ? 'animate-spin' : ''}`} />
                                                Refresh Disk
                                            </button>
                                            <button
                                                onClick={() => handleOpenFolder()}
                                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-white text-xs font-semibold text-zinc-950 transition"
                                            >
                                                <FolderOpen className="w-3.5 h-3.5" />
                                                Open in Explorer
                                            </button>
                                        </div>
                                    </div>

                                    {/* Vault Search & Container Filter Bar */}
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div className="flex-1 min-w-[220px] flex items-center bg-[#121216] border border-zinc-800 rounded-xl px-3 py-1.5">
                                            <Search className="w-3.5 h-3.5 text-zinc-500 mr-2" />
                                            <input
                                                type="text"
                                                value={vaultSearch}
                                                onChange={(e) => setVaultSearch(e.target.value)}
                                                placeholder="Filter archived files by title or channel..."
                                                className="w-full bg-transparent text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none select-text"
                                            />
                                        </div>
                                        <div className="flex items-center gap-1">
                                            {['ALL', 'MP4', 'MOV', 'FLAC', 'MP3'].map((ext) => (
                                                <button
                                                    key={ext}
                                                    onClick={() => setVaultExtFilter(ext)}
                                                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-mono border transition ${vaultExtFilter === ext
                                                            ? 'bg-zinc-800 border-zinc-600 text-zinc-100'
                                                            : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    {ext}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {filteredVault.length === 0 ? (
                                        <div className="bg-[#111115] border border-zinc-800/80 rounded-2xl p-14 text-center space-y-2">
                                            <Database className="w-7 h-7 text-zinc-600 mx-auto" />
                                            <p className="text-xs font-medium text-zinc-400">No matching media files found in vault</p>
                                        </div>
                                    ) : (
                                        <div className="bg-[#111115] border border-zinc-800 rounded-2xl overflow-hidden divide-y divide-zinc-800/70">
                                            {filteredVault.map((file) => (
                                                <div
                                                    key={file.path}
                                                    className="px-4 py-3 flex items-center justify-between gap-4 hover:bg-zinc-900/40 transition"
                                                >
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                                                            {['FLAC', 'MP3', 'M4A', 'WAV'].includes(file.ext) ? (
                                                                <FileAudio className="w-4 h-4 text-zinc-400" />
                                                            ) : (
                                                                <FileVideo className="w-4 h-4 text-zinc-400" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-xs font-medium text-zinc-200 truncate">{file.rel_path}</p>
                                                            <div className="flex items-center gap-3 text-[11px] font-mono text-zinc-500 mt-0.5">
                                                                <span className="px-1.5 py-0.2 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                                                    {file.ext}
                                                                </span>
                                                                <span>{file.size_mb} MB</span>
                                                                <span>{file.modified}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 shrink-0">
                                                        <button
                                                            onClick={() => handleOpenFolder(file.path)}
                                                            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 transition"
                                                        >
                                                            Reveal
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteVaultFile(file.path)}
                                                            className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-950/60 border border-zinc-800 hover:border-red-800/60 text-zinc-500 hover:text-red-300 transition"
                                                            title="Delete from Disk"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </motion.div>
                            )}

                            {/* ---------------- TAB 4: PERSISTENT PREFERENCES ---------------- */}
                            {activeTab === 'settings' && (
                                <motion.div
                                    key="settings"
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    transition={SPRING_SNAPPY}
                                    className="space-y-6 pb-10"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h1 className="text-lg font-semibold tracking-tight">Engine & Storage Preferences</h1>
                                            <p className="text-xs text-zinc-400 mt-0.5">
                                                Persisted locally to config.json for media server automation and network tuning.
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleSaveSettings(settings)}
                                            disabled={savingSettings}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-semibold transition"
                                        >
                                            {settingsSavedBadge ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                                    Saved to Disk
                                                </>
                                            ) : (
                                                <>
                                                    <Server className="w-3.5 h-3.5" />
                                                    {savingSettings ? 'Saving...' : 'Save Configuration'}
                                                </>
                                            )}
                                        </button>
                                    </div>

                                    {/* Section 0: Studio Color Theme */}
                                    <div className="bg-[#111115] border border-zinc-800 rounded-2xl p-5 space-y-3">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            <Palette className="w-4 h-4" />
                                            Workspace Appearance & Contrast Theme
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                            {THEME_CYCLE.map((tKey) => (
                                                <button
                                                    key={tKey}
                                                    onClick={() => {
                                                        const updated = { ...settings, theme: tKey };
                                                        setSettings(updated);
                                                        handleSaveSettings(updated);
                                                    }}
                                                    className={`p-3 rounded-xl border text-left transition flex items-center justify-between ${(settings.theme || 'dark') === tKey
                                                            ? 'bg-zinc-800 border-zinc-500 text-zinc-100'
                                                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                                                        }`}
                                                >
                                                    <span className="text-xs font-medium">{THEME_LABELS[tKey]}</span>
                                                    {(settings.theme || 'dark') === tKey && <Check className="w-3.5 h-3.5" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Section 1: Storage & Media Server Organization */}
                                    <div className="bg-[#111115] border border-zinc-800 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            <FolderGit2 className="w-4 h-4" />
                                            Storage, Duplicate Ledger & Media Server Naming (Jellyfin / Plex)
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-300 block">
                                                Output Directory Path
                                            </label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={settings.download_dir}
                                                    onChange={(e) => setSettings({ ...settings, download_dir: e.target.value })}
                                                    className="flex-1 px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 select-text"
                                                />
                                                <button
                                                    onClick={handlePickNativeFolder}
                                                    className="px-3.5 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 transition"
                                                >
                                                    Browse...
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-300 block">
                                                    File Naming Schema
                                                </label>
                                                <select
                                                    value={settings.naming_template}
                                                    onChange={(e) => setSettings({ ...settings, naming_template: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                                                >
                                                    <option value="standard">Standard — Title [ID].ext</option>
                                                    <option value="media_server">Jellyfin / Plex — YYYY-MM-DD - Title [ID].ext</option>
                                                    <option value="clean">Clean — Title.ext</option>
                                                </select>
                                            </div>

                                            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                                                <div>
                                                    <div className="text-xs font-medium text-zinc-200">Creator Subfolders</div>
                                                    <div className="text-[11px] text-zinc-500">
                                                        Group downloads into /ChannelName/ folders
                                                    </div>
                                                </div>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.organizer_subfolder}
                                                    onChange={(e) =>
                                                        setSettings({ ...settings, organizer_subfolder: e.target.checked })
                                                    }
                                                    className="w-4 h-4 accent-zinc-200"
                                                />
                                            </div>
                                        </div>

                                        {/* Duplicate Archive Ledger Row */}
                                        <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
                                            <div className="flex items-center gap-3">
                                                <Archive className="w-4 h-4 text-zinc-400" />
                                                <div>
                                                    <div className="text-xs font-medium text-zinc-200">
                                                        Duplicate Prevention Ledger (archive.txt)
                                                    </div>
                                                    <div className="text-[11px] text-zinc-500">
                                                        Skip streams that have already been archived ({systemInfo?.archive_count || 0} IDs logged)
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {systemInfo?.archive_count > 0 && (
                                                    <button
                                                        onClick={handleClearArchive}
                                                        className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-[11px] text-zinc-300 transition"
                                                    >
                                                        Reset Ledger
                                                    </button>
                                                )}
                                                <input
                                                    type="checkbox"
                                                    checked={settings.use_archive}
                                                    onChange={(e) => setSettings({ ...settings, use_archive: e.target.checked })}
                                                    className="w-4 h-4 accent-zinc-200"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 2: Authentication & Network Concurrency */}
                                    <div className="bg-[#111115] border border-zinc-800 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            <Cookie className="w-4 h-4" />
                                            Browser Cookies, Auth & Network Concurrency
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-300 block">
                                                    Import Session Cookies From Browser
                                                </label>
                                                <select
                                                    value={settings.cookies_browser}
                                                    onChange={(e) => setSettings({ ...settings, cookies_browser: e.target.value })}
                                                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-200"
                                                >
                                                    <option value="none">Disabled (Public Streams Only)</option>
                                                    <option value="firefox">Mozilla Firefox / LibreWolf</option>
                                                    <option value="chrome">Google Chrome</option>
                                                    <option value="edge">Microsoft Edge</option>
                                                    <option value="brave">Brave Browser</option>
                                                </select>
                                                <p className="text-[11px] text-zinc-500">
                                                    Unlocks age-restricted streams, member VODs, and YouTube Premium enhanced bitrates.
                                                </p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-zinc-300 block">
                                                    HTTP / SOCKS5 Proxy (Optional)
                                                </label>
                                                <input
                                                    type="text"
                                                    value={settings.proxy_url}
                                                    onChange={(e) => setSettings({ ...settings, proxy_url: e.target.value })}
                                                    placeholder="socks5://127.0.0.1:1080 or http://..."
                                                    className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-200 select-text"
                                                />
                                                <p className="text-[11px] text-zinc-500">
                                                    Route all stream probes and fragment downloads through a custom proxy tunnel.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-800/80">
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-300 font-medium">Concurrent Fragment Threads</span>
                                                    <span className="font-mono text-zinc-200">{settings.concurrent_fragments} Threads</span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="16"
                                                    step="1"
                                                    value={settings.concurrent_fragments}
                                                    onChange={(e) =>
                                                        setSettings({ ...settings, concurrent_fragments: Number(e.target.value) })
                                                    }
                                                    className="w-full accent-zinc-200 cursor-pointer"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-zinc-300 font-medium">Bandwidth Rate Limiter</span>
                                                    <span className="font-mono text-zinc-200">
                                                        {settings.speed_limit_mb === 0 ? 'Unlimited' : `${settings.speed_limit_mb} MB/s`}
                                                    </span>
                                                </div>
                                                <input
                                                    type="range"
                                                    min="0"
                                                    max="100"
                                                    step="5"
                                                    value={settings.speed_limit_mb}
                                                    onChange={(e) =>
                                                        setSettings({ ...settings, speed_limit_mb: Number(e.target.value) })
                                                    }
                                                    className="w-full accent-zinc-200 cursor-pointer"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Section 3: Post-Processing & UI Defaults */}
                                    <div className="bg-[#111115] border border-zinc-800 rounded-2xl p-5 space-y-4">
                                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                                            <Cpu className="w-4 h-4" />
                                            Post-Processing Defaults & Environment Diagnostics
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                                                <span className="text-xs text-zinc-300">Subtitle Lang</span>
                                                <input
                                                    type="text"
                                                    value={settings.sub_lang}
                                                    onChange={(e) => setSettings({ ...settings, sub_lang: e.target.value })}
                                                    className="w-14 px-2 py-1 rounded bg-zinc-950 border border-zinc-700 text-xs font-mono text-center text-zinc-100"
                                                />
                                            </div>

                                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                                                <span className="text-xs text-zinc-300">Loudness (-14 LUFS)</span>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.normalize_audio}
                                                    onChange={(e) => setSettings({ ...settings, normalize_audio: e.target.checked })}
                                                    className="w-4 h-4 accent-zinc-200"
                                                />
                                            </div>

                                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                                                <span className="text-xs text-zinc-300">UI Audio Cues</span>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.audio_sfx}
                                                    onChange={(e) => setSettings({ ...settings, audio_sfx: e.target.checked })}
                                                    className="w-4 h-4 accent-zinc-200"
                                                />
                                            </div>

                                            <div className="p-3 rounded-xl bg-zinc-900/50 border border-zinc-800 flex items-center justify-between">
                                                <span className="text-xs text-zinc-300">GPU Acceleration</span>
                                                <input
                                                    type="checkbox"
                                                    checked={settings.hw_accel}
                                                    onChange={(e) => setSettings({ ...settings, hw_accel: e.target.checked })}
                                                    className="w-4 h-4 accent-zinc-200"
                                                />
                                            </div>
                                        </div>

                                        {systemInfo && (
                                            <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/90 font-mono text-[11px] text-zinc-400 space-y-1">
                                                <div>ENGINE_BINARY: yt-dlp v{systemInfo.yt_dlp_version}</div>
                                                <div>FFMPEG_STATUS: {systemInfo.ffmpeg_path}</div>
                                                <div>ARCHIVE_LEDGER: {systemInfo.archive_count} unique stream IDs tracked</div>
                                                <div>VAULT_VOLUME: {systemInfo.disk_free_gb} GB Free / {systemInfo.disk_total_gb} GB Total</div>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
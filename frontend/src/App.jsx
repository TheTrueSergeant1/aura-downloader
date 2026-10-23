import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Download, Sparkles, Link2, Film, Music, Cpu, Scissors,
    Layers, CheckCircle2, AlertCircle, FolderOpen, Volume2,
    VolumeX, GripVertical, Zap, Clock, HardDrive, Clipboard,
    Sliders, Trash2, Check, Loader2, ShieldCheck
} from 'lucide-react';

const API_BASE = 'http://127.0.0.1:8000';
const WS_URL = 'ws://127.0.0.1:8000/ws';

// Tuned to feel close to iOS / macOS SwiftUI spring curves
const SPRING_SNAPPY = { type: 'spring', stiffness: 420, damping: 32, mass: 0.9 };
const SPRING_SOFT = { type: 'spring', stiffness: 280, damping: 26, mass: 1 };

// Using Web Audio API directly so we don't have to bundle external .wav/.mp3 assets
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
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
            gain.gain.setValueAtTime(0.06, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
            osc.start(now);
            osc.stop(now + 0.09);
        } else if (type === 'start') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(660, now + 0.12);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
            osc.start(now);
            osc.stop(now + 0.13);
        } else if (type === 'complete') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(880, now + 0.09);
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
            osc.start(now);
            osc.stop(now + 0.3);
        }
    } catch {
        // WebView autoplay policy might block audio if user hasn't clicked anything yet
    }
};

export default function App() {
    const [activeTab, setActiveTab] = useState('capture');
    const [urlInput, setUrlInput] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analyzedMedia, setAnalyzedMedia] = useState(null);
    const [errorMsg, setErrorMsg] = useState('');

    // Export config
    const [mode, setMode] = useState('video');
    const [resolution, setResolution] = useState('2160');
    const [multithread, setMultithread] = useState(true);
    const [splitChapters, setSplitChapters] = useState(false);
    const [hwAccel, setHwAccel] = useState(true);
    const [embedMetadata, setEmbedMetadata] = useState(true);
    const [speedLimit, setSpeedLimit] = useState(0);

    const [queue, setQueue] = useState([]);
    const [islandExpanded, setIslandExpanded] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);

    // Keep a ref so the websocket closure always reads the latest mute state
    const soundRef = useRef(soundEnabled);
    soundRef.current = soundEnabled;

    useEffect(() => {
        let ws;
        let retryTimer;

        const connectWs = () => {
            ws = new WebSocket(WS_URL);
            ws.onmessage = (event) => {
                const incoming = JSON.parse(event.data);
                setQueue((prev) => {
                    const exists = prev.some((item) => item.id === incoming.id);
                    if (exists) {
                        return prev.map((item) => {
                            if (item.id === incoming.id) {
                                if (item.status !== 'completed' && incoming.status === 'completed') {
                                    triggerSfx('complete', soundRef.current);
                                }
                                return { ...item, ...incoming };
                            }
                            return item;
                        });
                    }
                    return [incoming, ...prev];
                });
            };

            // Auto-reconnect if the Python sidecar takes a second to cold-boot
            ws.onclose = () => {
                retryTimer = setTimeout(connectWs, 2000);
            };
        };

        connectWs();
        return () => {
            clearTimeout(retryTimer);
            if (ws) ws.close();
        };
    }, []);

    const formatDuration = (sec) => {
        if (!sec) return '0:00';
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const handleAnalyze = async (targetUrl = urlInput) => {
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
            triggerSfx('sniff', soundEnabled);
        } catch (err) {
            setErrorMsg(err.message || 'Could not reach local media engine.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleClipboardSniff = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.startsWith('http://') || text.startsWith('https://'))) {
                setUrlInput(text);
                handleAnalyze(text);
            } else {
                setErrorMsg('Clipboard does not contain a valid HTTP/HTTPS link.');
            }
        } catch {
            setErrorMsg('Clipboard read blocked by system permissions.');
        }
    };

    const handleStartDownload = async () => {
        if (!analyzedMedia) return;
        triggerSfx('start', soundEnabled);

        try {
            await fetch(`${API_BASE}/api/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: analyzedMedia.webpage_url || urlInput,
                    title: analyzedMedia.title,
                    thumbnail: analyzedMedia.thumbnail,
                    mode,
                    resolution,
                    multithread,
                    split_chapters: splitChapters,
                    hw_accel: hwAccel,
                    embed_metadata: embedMetadata,
                    speed_limit_mb: speedLimit > 0 ? speedLimit : null,
                }),
            });
            setAnalyzedMedia(null);
            setUrlInput('');
            setActiveTab('queue');
        } catch {
            setErrorMsg('Failed to dispatch job to backend queue.');
        }
    };

    const handleOpenFolder = async () => {
        await fetch(`${API_BASE}/api/open-folder`, { method: 'POST' });
    };

    const activeDownloads = queue.filter(
        (q) => q.status === 'downloading' || q.status === 'starting' || q.status === 'processing'
    );
    const totalSpeed = activeDownloads.reduce((acc, item) => acc + (item.speed_mb || 0), 0).toFixed(1);
    const avgProgress = activeDownloads.length
        ? Math.round(activeDownloads.reduce((acc, item) => acc + (item.percent || 0), 0) / activeDownloads.length)
        : 0;

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-[#060609] flex select-none">
            {/* Ambient background glow */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-blue-600/18 blur-[130px]" />
                <div className="absolute top-1/3 right-[-120px] w-[460px] h-[460px] rounded-full bg-indigo-600/15 blur-[140px]" />
                <div className="absolute bottom-[-160px] left-1/3 w-[500px] h-[500px] rounded-full bg-cyan-500/10 blur-[150px]" />
            </div>

            {/* Floating status pill (Dynamic Island style) */}
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
                <motion.div
                    layout
                    transition={SPRING_SNAPPY}
                    onClick={() => setIslandExpanded(!islandExpanded)}
                    className="cursor-pointer bg-black/85 backdrop-blur-2xl border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-[28px] text-white overflow-hidden"
                    style={{ minWidth: islandExpanded ? 390 : 230 }}
                >
                    <motion.div layout className="px-4 py-2.5 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            {isAnalyzing ? (
                                <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                            ) : activeDownloads.length > 0 ? (
                                <div className="relative w-5 h-5 flex items-center justify-center">
                                    <svg className="w-5 h-5 -rotate-90">
                                        <circle cx="10" cy="10" r="8" stroke="rgba(255,255,255,0.15)" strokeWidth="2.2" fill="none" />
                                        <circle
                                            cx="10"
                                            cy="10"
                                            r="8"
                                            stroke="#3b82f6"
                                            strokeWidth="2.2"
                                            strokeDasharray={50.2}
                                            strokeDashoffset={50.2 - (50.2 * avgProgress) / 100}
                                            strokeLinecap="round"
                                            fill="none"
                                        />
                                    </svg>
                                </div>
                            ) : (
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
                            )}

                            <span className="text-xs font-medium tracking-tight text-white/90">
                                {isAnalyzing
                                    ? 'Sniffing Stream Metadata...'
                                    : activeDownloads.length > 0
                                        ? `${activeDownloads.length} Active · ${avgProgress}%`
                                        : 'Aura Engine Ready'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            {activeDownloads.length > 0 ? (
                                <span className="text-[11px] font-mono text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">
                                    {totalSpeed} MB/s
                                </span>
                            ) : (
                                <span className="text-[11px] text-white/40 font-mono">120Hz</span>
                            )}
                        </div>
                    </motion.div>

                    <AnimatePresence>
                        {islandExpanded && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={SPRING_SNAPPY}
                                className="px-5 pb-4 pt-1 border-t border-white/10 space-y-3"
                            >
                                <div className="flex items-center justify-between text-xs text-white/60">
                                    <span>Multi-Thread Chunk Engine</span>
                                    <span className="text-emerald-400 font-medium">
                                        {multithread ? '8x Parallel Streams' : 'Single Stream'}
                                    </span>
                                </div>
                                {activeDownloads.length > 0 ? (
                                    <div className="space-y-2">
                                        {activeDownloads.slice(0, 2).map((item) => (
                                            <div key={item.id} className="bg-white/5 rounded-xl p-2.5 flex items-center gap-3">
                                                {item.thumbnail && (
                                                    <img src={item.thumbnail} alt="" className="w-10 h-7 object-cover rounded-lg" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">{item.title}</p>
                                                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden mt-1.5">
                                                        <motion.div
                                                            className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                                                            animate={{ width: `${item.percent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                                <span className="text-xs font-mono text-white/70">{item.percent}%</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-white/40 text-center py-1">
                                        No active transfers. Paste any link to begin.
                                    </p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            </div>

            {/* Left navigation sidebar */}
            <aside className="relative z-10 w-64 h-full bg-white/[0.03] backdrop-blur-3xl border-r border-white/10 flex flex-col justify-between p-5">
                <div>
                    <div className="flex items-center justify-between mb-8 px-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-black/20" />
                            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-black/20" />
                            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-black/20" />
                        </div>
                        <span className="text-[11px] font-medium uppercase tracking-widest text-white/30">Pro Studio</span>
                    </div>

                    <div className="flex items-center gap-3 px-2 mb-8">
                        <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/25">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold tracking-tight">Aura</h1>
                            <p className="text-[11px] text-white/45">4K Media Archiver</p>
                        </div>
                    </div>

                    <nav className="space-y-1.5">
                        {[
                            { id: 'capture', label: 'Capture Studio', icon: Link2 },
                            { id: 'queue', label: 'Transfer Queue', icon: Layers, badge: queue.length },
                            { id: 'settings', label: 'Engine & Codec', icon: Sliders },
                        ].map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`relative w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-white/50 hover:text-white/80'
                                        }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active-pill"
                                            transition={SPRING_SNAPPY}
                                            className="absolute inset-0 bg-white/10 border border-white/15 rounded-2xl shadow-inner"
                                        />
                                    )}
                                    <span className="relative z-10 flex items-center gap-3">
                                        <Icon className="w-4 h-4" />
                                        {tab.label}
                                    </span>
                                    {tab.badge > 0 && (
                                        <span className="relative z-10 text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/20">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="space-y-2 pt-4 border-t border-white/10">
                    <button
                        onClick={handleOpenFolder}
                        className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 transition"
                    >
                        <span className="flex items-center gap-2.5">
                            <FolderOpen className="w-4 h-4 text-blue-400" />
                            Open Downloads Vault
                        </span>
                    </button>

                    <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-white/45 hover:text-white/75 transition"
                    >
                        <span className="flex items-center gap-2">
                            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-emerald-400" /> : <VolumeX className="w-3.5 h-3.5" />}
                            Tactile Audio Feedback
                        </span>
                        <span>{soundEnabled ? 'On' : 'Muted'}</span>
                    </button>
                </div>
            </aside>

            {/* Main view container */}
            <main className="relative z-10 flex-1 h-full overflow-y-auto pt-20 pb-12 px-10">
                <div className="max-w-4xl mx-auto">
                    <AnimatePresence mode="wait">
                        {activeTab === 'capture' && (
                            <motion.div
                                key="capture"
                                initial={{ opacity: 0, y: 15, scale: 0.99 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -15, scale: 0.99 }}
                                transition={SPRING_SNAPPY}
                                className="space-y-8"
                            >
                                <div className="text-center space-y-2 pt-2">
                                    <h2 className="text-3xl font-semibold tracking-tight bg-gradient-to-b from-white to-white/65 bg-clip-text text-transparent">
                                        Universal Stream Sniffer
                                    </h2>
                                    <p className="text-sm text-white/45">
                                        Paste a link from YouTube, Twitch, Vimeo, X, or 1,000+ platforms for instant lossless extraction.
                                    </p>
                                </div>

                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 via-indigo-500/30 to-cyan-500/30 rounded-3xl blur-xl opacity-60 group-hover:opacity-100 transition duration-500" />
                                    <div className="relative flex items-center bg-[#121218]/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-2 shadow-2xl">
                                        <div className="pl-4 pr-3 text-white/40">
                                            <Link2 className="w-5 h-5" />
                                        </div>
                                        <input
                                            type="text"
                                            value={urlInput}
                                            onChange={(e) => setUrlInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 focus:outline-none select-text"
                                        />
                                        <div className="flex items-center gap-2 pr-1">
                                            <motion.button
                                                whileTap={{ scale: 0.95 }}
                                                onClick={handleClipboardSniff}
                                                title="Sniff from Clipboard"
                                                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/80 transition"
                                            >
                                                <Clipboard className="w-3.5 h-3.5 text-blue-400" />
                                                Paste
                                            </motion.button>
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.96 }}
                                                disabled={isAnalyzing || !urlInput.trim()}
                                                onClick={() => handleAnalyze()}
                                                className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-blue-600/30 transition"
                                            >
                                                {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                {isAnalyzing ? 'Inspecting...' : 'Analyze'}
                                            </motion.button>
                                        </div>
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {errorMsg && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -8 }}
                                            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs"
                                        >
                                            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                                            <span>{errorMsg}</span>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <AnimatePresence>
                                    {analyzedMedia && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 25, scale: 0.96 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            exit={{ opacity: 0, y: 15, scale: 0.96 }}
                                            transition={SPRING_SNAPPY}
                                            className="bg-white/[0.04] backdrop-blur-3xl border border-white/15 rounded-[32px] p-6 shadow-[0_25px_70px_rgba(0,0,0,0.6)] space-y-6"
                                        >
                                            <div className="flex flex-col md:flex-row gap-6 items-start">
                                                <div className="relative w-full md:w-64 aspect-video rounded-2xl overflow-hidden bg-black/50 border border-white/10 shrink-0">
                                                    {analyzedMedia.thumbnail && (
                                                        <img
                                                            src={analyzedMedia.thumbnail}
                                                            alt={analyzedMedia.title}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    )}
                                                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-lg bg-black/75 backdrop-blur-md text-[11px] font-mono text-white">
                                                        {formatDuration(analyzedMedia.duration)}
                                                    </div>
                                                </div>

                                                <div className="flex-1 space-y-3">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/20 text-blue-300 border border-blue-400/20">
                                                            {analyzedMedia.uploader}
                                                        </span>
                                                        {analyzedMedia.chapters > 0 && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-500/20 text-purple-300 border border-purple-400/20">
                                                                {analyzedMedia.chapters} Embedded Chapters
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h3 className="text-lg font-semibold leading-snug text-white">
                                                        {analyzedMedia.title}
                                                    </h3>

                                                    <div className="pt-2">
                                                        <label className="text-[11px] uppercase tracking-wider text-white/40 block mb-2">
                                                            Master Format Profile
                                                        </label>
                                                        <div className="inline-flex p-1 rounded-2xl bg-black/40 border border-white/10">
                                                            {[
                                                                { id: 'video', label: 'MP4 Video', icon: Film },
                                                                { id: 'audio', label: 'Lossless FLAC', icon: Music },
                                                                { id: 'prores', label: 'Apple ProRes .MOV', icon: Cpu },
                                                            ].map((item) => {
                                                                const Icon = item.icon;
                                                                const active = mode === item.id;
                                                                return (
                                                                    <button
                                                                        key={item.id}
                                                                        onClick={() => setMode(item.id)}
                                                                        className={`relative flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition ${active ? 'text-white' : 'text-white/45 hover:text-white/80'
                                                                            }`}
                                                                    >
                                                                        {active && (
                                                                            <motion.div
                                                                                layoutId="format-pill"
                                                                                transition={SPRING_SNAPPY}
                                                                                className="absolute inset-0 bg-white/15 border border-white/20 rounded-xl"
                                                                            />
                                                                        )}
                                                                        <Icon className="w-3.5 h-3.5 relative z-10" />
                                                                        <span className="relative z-10">{item.label}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {mode === 'video' && (
                                                <div className="space-y-2 pt-2 border-t border-white/10">
                                                    <label className="text-[11px] uppercase tracking-wider text-white/40 block">
                                                        Target Stream Resolution
                                                    </label>
                                                    <div className="grid grid-cols-4 gap-2.5">
                                                        {[
                                                            { val: '2160', label: '4K Ultra HD', sub: '2160p60 HDR' },
                                                            { val: '1440', label: '2K QHD', sub: '1440p60' },
                                                            { val: '1080', label: 'Full HD', sub: '1080p High Bitrate' },
                                                            { val: '720', label: 'Compact HD', sub: '720p Fast' },
                                                        ].map((res) => (
                                                            <button
                                                                key={res.val}
                                                                onClick={() => setResolution(res.val)}
                                                                className={`p-3 rounded-2xl border text-left transition ${resolution === res.val
                                                                        ? 'bg-blue-500/20 border-blue-400/50 text-white shadow-lg shadow-blue-500/10'
                                                                        : 'bg-white/[0.02] border-white/10 text-white/55 hover:bg-white/[0.05]'
                                                                    }`}
                                                            >
                                                                <div className="text-xs font-semibold">{res.label}</div>
                                                                <div className="text-[10px] text-white/40 mt-0.5">{res.sub}</div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
                                                {[
                                                    {
                                                        label: '8x Multi-Thread',
                                                        desc: 'Parallel byte chunking',
                                                        state: multithread,
                                                        setter: setMultithread,
                                                        icon: Zap,
                                                    },
                                                    {
                                                        label: 'Split Chapters',
                                                        desc: 'Auto-slice chapter files',
                                                        state: splitChapters,
                                                        setter: setSplitChapters,
                                                        icon: Scissors,
                                                    },
                                                    {
                                                        label: 'GPU Hardware',
                                                        desc: 'NVENC / VideoToolbox',
                                                        state: hwAccel,
                                                        setter: setHwAccel,
                                                        icon: Cpu,
                                                    },
                                                    {
                                                        label: 'Embed Metadata',
                                                        desc: 'Tags & studio artwork',
                                                        state: embedMetadata,
                                                        setter: setEmbedMetadata,
                                                        icon: ShieldCheck,
                                                    },
                                                ].map((toggle) => {
                                                    const Icon = toggle.icon;
                                                    return (
                                                        <button
                                                            key={toggle.label}
                                                            onClick={() => toggle.setter(!toggle.state)}
                                                            className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${toggle.state
                                                                    ? 'bg-white/10 border-white/25 text-white'
                                                                    : 'bg-white/[0.02] border-white/10 text-white/40'
                                                                }`}
                                                        >
                                                            <div className="flex items-center justify-between w-full mb-2">
                                                                <Icon className={`w-4 h-4 ${toggle.state ? 'text-blue-400' : 'text-white/30'}`} />
                                                                <div
                                                                    className={`w-4 h-4 rounded-full flex items-center justify-center ${toggle.state ? 'bg-blue-500 text-white' : 'border border-white/20'
                                                                        }`}
                                                                >
                                                                    {toggle.state && <Check className="w-2.5 h-2.5" />}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <div className="text-xs font-medium">{toggle.label}</div>
                                                                <div className="text-[10px] text-white/40">{toggle.desc}</div>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <motion.button
                                                whileHover={{ scale: 1.01 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleStartDownload}
                                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-500 text-white font-semibold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2"
                                            >
                                                <Download className="w-4 h-4" />
                                                Start High-Speed Extraction
                                            </motion.button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}

                        {activeTab === 'queue' && (
                            <motion.div
                                key="queue"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={SPRING_SNAPPY}
                                className="space-y-6"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h2 className="text-2xl font-semibold tracking-tight">Priority Transfer Queue</h2>
                                        <p className="text-xs text-white/45 mt-0.5">
                                            Drag cards to reprioritize order with live 120Hz spring physics.
                                        </p>
                                    </div>
                                    {queue.length > 0 && (
                                        <button
                                            onClick={() => setQueue((prev) => prev.filter((i) => i.status === 'downloading'))}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-white/60 transition"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Clear Completed
                                        </button>
                                    )}
                                </div>

                                {queue.length === 0 ? (
                                    <div className="bg-white/[0.02] border border-white/10 rounded-3xl p-14 text-center space-y-3">
                                        <Layers className="w-8 h-8 text-white/25 mx-auto" />
                                        <p className="text-sm text-white/50">Your transfer queue is empty.</p>
                                    </div>
                                ) : (
                                    <Reorder.Group axis="y" values={queue} onReorder={setQueue} className="space-y-3">
                                        {queue.map((item) => (
                                            <Reorder.Item
                                                key={item.id}
                                                value={item}
                                                transition={SPRING_SOFT}
                                                className="bg-white/[0.04] backdrop-blur-2xl border border-white/15 rounded-3xl p-4 flex items-center gap-4 cursor-grab active:cursor-grabbing shadow-lg"
                                            >
                                                <GripVertical className="w-4 h-4 text-white/25 shrink-0" />

                                                {item.thumbnail && (
                                                    <img
                                                        src={item.thumbnail}
                                                        alt=""
                                                        className="w-20 h-12 object-cover rounded-xl border border-white/10 shrink-0"
                                                    />
                                                )}

                                                <div className="flex-1 min-w-0 space-y-2">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <p className="text-sm font-medium truncate text-white">{item.title}</p>
                                                        <span className="text-xs font-mono text-white/70 shrink-0">
                                                            {item.status === 'completed'
                                                                ? 'Completed'
                                                                : item.status === 'processing'
                                                                    ? 'Muxing Container...'
                                                                    : item.status === 'error'
                                                                        ? 'Failed'
                                                                        : `${item.percent}%`}
                                                        </span>
                                                    </div>

                                                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${item.percent || 0}%` }}
                                                            transition={{ ease: 'easeOut', duration: 0.25 }}
                                                            className={`h-full rounded-full ${item.status === 'completed'
                                                                    ? 'bg-emerald-400'
                                                                    : item.status === 'error'
                                                                        ? 'bg-red-500'
                                                                        : 'bg-gradient-to-r from-blue-500 via-indigo-400 to-cyan-400'
                                                                }`}
                                                        />
                                                    </div>

                                                    <div className="flex items-center gap-4 text-[11px] text-white/45 font-mono">
                                                        <span className="flex items-center gap-1">
                                                            <Zap className="w-3 h-3 text-blue-400" />
                                                            {item.speed_mb || 0} MB/s
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            ETA: {item.eta ? `${item.eta}s` : '--'}
                                                        </span>
                                                        {item.size_mb > 0 && (
                                                            <span className="flex items-center gap-1">
                                                                <HardDrive className="w-3 h-3" />
                                                                {item.size_mb} MB
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {item.status === 'completed' ? (
                                                    <button
                                                        onClick={handleOpenFolder}
                                                        className="p-2.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 hover:bg-emerald-500/25 transition"
                                                        title="Reveal in Folder"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                    </button>
                                                ) : null}
                                            </Reorder.Item>
                                        ))}
                                    </Reorder.Group>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'settings' && (
                            <motion.div
                                key="settings"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -15 }}
                                transition={SPRING_SNAPPY}
                                className="space-y-6"
                            >
                                <div>
                                    <h2 className="text-2xl font-semibold tracking-tight">Engine & Bandwidth Control</h2>
                                    <p className="text-xs text-white/45 mt-0.5">
                                        Fine-tune thread concurrency, network throttling, and hardware transcoding.
                                    </p>
                                </div>

                                <div className="bg-white/[0.04] backdrop-blur-2xl border border-white/15 rounded-3xl p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-medium">Bandwidth Speed Limiter</h4>
                                            <p className="text-xs text-white/45">
                                                Prevent 4K streams from saturating your local network (0 = Unlimited).
                                            </p>
                                        </div>
                                        <span className="text-sm font-mono text-blue-400">
                                            {speedLimit === 0 ? 'Unlimited' : `${speedLimit} MB/s`}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        step="5"
                                        value={speedLimit}
                                        onChange={(e) => setSpeedLimit(Number(e.target.value))}
                                        className="w-full accent-blue-500 cursor-pointer"
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
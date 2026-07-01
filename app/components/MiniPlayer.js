'use client';

// Mini-lecteur global façon Spotify : barre fixe en bas, lecture via l'API
// IFrame YouTube. Monté une seule fois dans le layout racine → la musique
// continue quand on navigue. La vignette vidéo reste visible (conforme aux CGU
// YouTube : pas de lecture audio « cachée »).

import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '@/app/contexts/PlayerContext';
import { Play, Pause, X, Volume2 } from 'lucide-react';

let ytPromise = null;
function loadYT() {
    if (typeof window === 'undefined') return Promise.resolve(null);
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (ytPromise) return ytPromise;
    ytPromise = new Promise((resolve) => {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { if (prev) prev(); resolve(window.YT); };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    });
    return ytPromise;
}

function fmt(s) {
    if (!s || isNaN(s)) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
}

export default function MiniPlayer() {
    const { current, isPlaying, close, setIsPlaying } = usePlayer();
    const frameRef = useRef(null);
    const playerRef = useRef(null);
    const [time, setTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(80);

    // Crée le lecteur à la première vidéo, puis change de vidéo à la volée.
    useEffect(() => {
        if (!current?.videoId) return;
        let cancelled = false;
        loadYT().then((YT) => {
            if (cancelled || !YT) return;
            if (!playerRef.current && frameRef.current) {
                playerRef.current = new YT.Player(frameRef.current, {
                    videoId: current.videoId,
                    playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0, playsinline: 1 },
                    events: {
                        onReady: (e) => {
                            e.target.setVolume(volume);
                            e.target.playVideo();
                            setDuration(e.target.getDuration() || 0);
                        },
                        onStateChange: (e) => {
                            if (e.data === 1) { setIsPlaying(true); setDuration(e.target.getDuration() || 0); }
                            else if (e.data === 2 || e.data === 0) setIsPlaying(false);
                        },
                    },
                });
            } else if (playerRef.current?.loadVideoById) {
                playerRef.current.loadVideoById(current.videoId);
                setTime(0);
                setDuration(0);
            }
        });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [current?.videoId]);

    // Suivi de la position de lecture
    useEffect(() => {
        const t = setInterval(() => {
            const p = playerRef.current;
            if (p?.getCurrentTime) {
                setTime(p.getCurrentTime() || 0);
                const d = p.getDuration?.() || 0;
                if (d) setDuration(d);
            }
        }, 500);
        return () => clearInterval(t);
    }, []);

    if (!current) return null;

    const toggle = () => {
        const p = playerRef.current;
        if (!p) return;
        if (isPlaying) p.pauseVideo();
        else p.playVideo();
    };
    const seek = (v) => { playerRef.current?.seekTo(Number(v), true); setTime(Number(v)); };
    const changeVol = (v) => { setVolume(Number(v)); playerRef.current?.setVolume(Number(v)); };
    const stop = () => {
        try { playerRef.current?.destroy?.(); } catch { /* noop */ }
        playerRef.current = null;
        close();
    };

    return (
        <div className="glass-rail animate-in slide-in-from-bottom-2 fixed bottom-14 left-0 right-0 z-50 flex items-center gap-3 border-t border-white/10 px-3 py-2 duration-300 md:bottom-0 md:left-[260px] md:px-5">
            {/* Vignette vidéo (visible = conforme CGU YouTube) */}
            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md bg-black">
                <div ref={frameRef} className="pointer-events-none h-full w-full" />
            </div>

            {/* Titre / artiste */}
            <div className="hidden min-w-0 sm:flex sm:w-44 sm:flex-col">
                <span className="truncate text-sm font-semibold text-cream">{current.title}</span>
                <span className="truncate font-mono text-[11px] text-muted-foreground">{current.artist}</span>
            </div>

            {/* Play / pause */}
            <button
                onClick={toggle}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal text-console transition hover:brightness-110"
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>

            {/* Progression */}
            <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{fmt(time)}</span>
            <input
                type="range"
                min={0}
                max={duration || 0}
                value={time}
                onChange={(e) => seek(e.target.value)}
                className="h-1 flex-1 cursor-pointer accent-signal"
                aria-label="Position de lecture"
            />
            <span className="hidden font-mono text-[11px] tabular-nums text-muted-foreground sm:inline">{fmt(duration)}</span>

            {/* Volume */}
            <div className="hidden items-center gap-1.5 md:flex">
                <Volume2 className="h-4 w-4 text-muted-foreground" />
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={volume}
                    onChange={(e) => changeVol(e.target.value)}
                    className="h-1 w-20 cursor-pointer accent-signal"
                    aria-label="Volume"
                />
            </div>

            {/* Fermer */}
            <button
                onClick={stop}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition hover:text-vu"
                aria-label="Fermer le lecteur"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}

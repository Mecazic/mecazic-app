'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SetModal from './SetModal';
import SongModal from './SongModal';
import { cn } from '@/lib/utils';
import {
    ArrowLeft, CalendarDays, MapPin, Plus, ChevronUp, ChevronDown,
    Pencil, Trash2, Loader2, Music, MessageSquare, Mic2,
} from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function ConcertDetail({ concert, onBack, onRefresh, groups, user, profile }) {
    const [sets, setSets] = useState([]);
    const [songs, setSongs] = useState({});
    const [loading, setLoading] = useState(true);
    const [expandedSet, setExpandedSet] = useState(null);
    const [showSetModal, setShowSetModal] = useState(false);
    const [editSet, setEditSet] = useState(null);
    const [showSongModal, setShowSongModal] = useState(false);
    const [editSong, setEditSong] = useState(null);
    const [activeSongSetId, setActiveSongSetId] = useState(null);
    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        fetchSets();
    }, [concert.id]);

    const fetchSets = async () => {
        setLoading(true);
        const { data: setsData } = await supabase
            .from('concert_sets')
            .select('*, groups(name, color)')
            .eq('concert_id', concert.id)
            .order('set_order');

        setSets(setsData || []);

        // Fetch songs for all sets
        const setIds = (setsData || []).map(s => s.id);
        if (setIds.length > 0) {
            const { data: songsData } = await supabase
                .from('set_songs')
                .select('*')
                .in('set_id', setIds)
                .order('song_order');

            const songsMap = {};
            (songsData || []).forEach(song => {
                if (!songsMap[song.set_id]) songsMap[song.set_id] = [];
                songsMap[song.set_id].push(song);
            });
            setSongs(songsMap);
        } else {
            setSongs({});
        }

        setLoading(false);
    };

    const handleDeleteSet = async (setId) => {
        if (!confirm('Supprimer ce passage et toutes ses chansons ?')) return;
        try {
            const { error } = await supabase.from('concert_sets').delete().eq('id', setId);
            if (error) {
                console.error('Erreur suppression set:', error);
                alert('Erreur lors de la suppression du passage : ' + error.message);
                return;
            }
            fetchSets();
            onRefresh();
        } catch (err) {
            console.error('Exception handleDeleteSet:', err);
            alert('Erreur inattendue lors de la suppression du passage.');
        }
    };

    const handleDeleteSong = async (songId) => {
        if (!confirm('Supprimer cette chanson ?')) return;
        try {
            const { error } = await supabase.from('set_songs').delete().eq('id', songId);
            if (error) {
                console.error('Erreur suppression chanson:', error);
                alert('Erreur lors de la suppression de la chanson : ' + error.message);
                return;
            }
            fetchSets();
        } catch (err) {
            console.error('Exception handleDeleteSong:', err);
            alert('Erreur inattendue lors de la suppression de la chanson.');
        }
    };

    const handleMoveSet = async (setId, direction) => {
        const idx = sets.findIndex(s => s.id === setId);
        if (idx === -1) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= sets.length) return;

        const updates = [
            { id: sets[idx].id, set_order: sets[swapIdx].set_order },
            { id: sets[swapIdx].id, set_order: sets[idx].set_order },
        ];

        for (const u of updates) {
            await supabase.from('concert_sets').update({ set_order: u.set_order }).eq('id', u.id);
        }
        fetchSets();
    };

    const handleMoveSong = async (setId, songId, direction) => {
        const setSongsList = songs[setId] || [];
        const idx = setSongsList.findIndex(s => s.id === songId);
        if (idx === -1) return;
        const swapIdx = idx + direction;
        if (swapIdx < 0 || swapIdx >= setSongsList.length) return;

        const updates = [
            { id: setSongsList[idx].id, song_order: setSongsList[swapIdx].song_order },
            { id: setSongsList[swapIdx].id, song_order: setSongsList[idx].song_order },
        ];

        for (const u of updates) {
            await supabase.from('set_songs').update({ song_order: u.song_order }).eq('id', u.id);
        }
        fetchSets();
    };

    const formatDuration = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '--:--';
        return timeStr.slice(0, 5);
    };

    const totalDuration = sets.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    const totalSongs = Object.values(songs).reduce((sum, arr) => sum + arr.length, 0);

    const getSetSongsDuration = (setId) => {
        return (songs[setId] || []).reduce((sum, s) => sum + (s.duration_seconds || 0), 0);
    };

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

    const concertDate = new Date(concert.date + 'T00:00:00');
    const formattedDate = `${dayNames[concertDate.getDay()]} ${concertDate.getDate()} ${monthNames[concertDate.getMonth()]} ${concertDate.getFullYear()}`;

    const iconBtn = 'flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-panel hover:text-cream disabled:pointer-events-none disabled:opacity-30';

    return (
        <div className="animate-in fade-in duration-300">
            {/* En-tête */}
            <div className="mb-6">
                <button
                    onClick={onBack}
                    className="mb-3 flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-cream"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Retour
                </button>
                <h1 className="font-caps text-3xl font-extrabold uppercase tracking-normal text-cream">
                    {concert.name}
                </h1>
                <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4 text-signal" />{formattedDate}
                    </span>
                    {concert.location && (
                        <span className="flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-signal" />{concert.location}
                        </span>
                    )}
                </div>
                {concert.description && (
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{concert.description}</p>
                )}
            </div>

            {/* Barre de stats */}
            <div className="glass mb-5 flex gap-8 rounded-xl px-6 py-4">
                <div className="flex flex-col items-center">
                    <span className="font-mono text-2xl font-extrabold text-signal">{sets.length}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Passage{sets.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-mono text-2xl font-extrabold text-signal">{totalSongs}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Chanson{totalSongs !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex flex-col items-center">
                    <span className="font-mono text-2xl font-extrabold text-signal">{totalDuration}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        min totales
                    </span>
                </div>
            </div>

            {/* Barre de progression (bus de mix) */}
            {sets.length > 0 && (
                <div className="mb-6">
                    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-panel">
                        {sets.map((set) => {
                            const width = totalDuration > 0
                                ? (set.duration_minutes / totalDuration) * 100
                                : 100 / sets.length;
                            return (
                                <div
                                    key={set.id}
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${width}%`,
                                        backgroundColor: set.groups?.color || '#666',
                                    }}
                                    title={`${set.groups?.name}: ${set.duration_minutes} min`}
                                />
                            );
                        })}
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-around gap-x-3 text-[11px] font-semibold">
                        {sets.map(set => (
                            <span key={set.id} style={{ color: set.groups?.color || '#666' }}>
                                {set.groups?.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Programme */}
            {loading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-signal" />
                </div>
            ) : (
                <div className="glass rounded-xl p-6">
                    <div className="mb-6 flex items-center justify-between">
                        <h2 className="font-display text-lg font-bold tracking-normal text-cream">Programme</h2>
                        <Button
                            size="sm"
                            onClick={() => { setEditSet(null); setShowSetModal(true); }}
                        >
                            <Plus className="h-4 w-4" />
                            Ajouter un passage
                        </Button>
                    </div>

                    {sets.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-12 text-center">
                            <Mic2 className="h-10 w-10 text-muted-foreground/40" />
                            <h3 className="font-semibold text-cream">Aucun passage prévu</h3>
                            <p className="text-sm text-muted-foreground">Ajoute le premier groupe au programme.</p>
                        </div>
                    ) : (
                        <div>
                            {sets.map((set, index) => {
                                const setSongs = songs[set.id] || [];
                                const isExpanded = expandedSet === set.id;
                                const songsDuration = getSetSongsDuration(set.id);
                                const fillPercent = set.duration_minutes > 0
                                    ? Math.min(100, (songsDuration / 60 / set.duration_minutes) * 100)
                                    : 0;
                                const color = set.groups?.color || '#666';

                                return (
                                    <div key={set.id} className="flex gap-4">
                                        {/* Connecteur */}
                                        <div className="flex w-6 flex-col items-center pt-1.5">
                                            <div
                                                className="h-3.5 w-3.5 shrink-0 rounded-full"
                                                style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}66` }}
                                            />
                                            {index < sets.length - 1 && (
                                                <div className="mt-1 w-0.5 flex-1 bg-border" />
                                            )}
                                        </div>

                                        {/* Contenu */}
                                        <div className="min-w-0 flex-1 pb-4">
                                            <div
                                                className="cursor-pointer rounded-md border border-border bg-panel p-3 transition-colors hover:border-border/80"
                                                style={{ borderLeftColor: color, borderLeftWidth: '3px' }}
                                                onClick={() => setExpandedSet(isExpanded ? null : set.id)}
                                            >
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex min-w-0 items-center gap-3">
                                                        <div className="min-w-[50px] font-mono text-lg font-bold text-cream">
                                                            {formatTime(set.start_time)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2 font-bold text-cream">
                                                                <span
                                                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                                                    style={{ backgroundColor: color }}
                                                                />
                                                                {set.groups?.name || 'Groupe inconnu'}
                                                            </div>
                                                            <div className="mt-0.5 text-xs text-muted-foreground">
                                                                {set.duration_minutes} min · {setSongs.length} chanson{setSongs.length !== 1 ? 's' : ''}
                                                                {songsDuration > 0 && (
                                                                    <span> · {formatDuration(songsDuration)} de musique</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex shrink-0 items-center gap-0.5">
                                                        <button
                                                            className={iconBtn}
                                                            onClick={(e) => { e.stopPropagation(); handleMoveSet(set.id, -1); }}
                                                            disabled={index === 0}
                                                            title="Monter"
                                                        ><ChevronUp className="h-4 w-4" /></button>
                                                        <button
                                                            className={iconBtn}
                                                            onClick={(e) => { e.stopPropagation(); handleMoveSet(set.id, 1); }}
                                                            disabled={index === sets.length - 1}
                                                            title="Descendre"
                                                        ><ChevronDown className="h-4 w-4" /></button>
                                                        <button
                                                            className={iconBtn}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditSet(set);
                                                                setShowSetModal(true);
                                                            }}
                                                            title="Modifier"
                                                        ><Pencil className="h-3.5 w-3.5" /></button>
                                                        {isAdmin && (
                                                            <button
                                                                className={cn(iconBtn, 'hover:text-vu')}
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }}
                                                                title="Supprimer"
                                                            ><Trash2 className="h-3.5 w-3.5" /></button>
                                                        )}
                                                        <ChevronDown
                                                            className={cn(
                                                                'ml-1 h-4 w-4 text-muted-foreground transition-transform',
                                                                isExpanded && 'rotate-180'
                                                            )}
                                                        />
                                                    </div>
                                                </div>

                                                {/* Barre de remplissage */}
                                                {set.duration_minutes > 0 && (
                                                    <div className="relative mt-4 h-1.5 rounded-full bg-white/[0.06]">
                                                        <div
                                                            className="h-full rounded-full opacity-60"
                                                            style={{ width: `${fillPercent}%`, backgroundColor: color }}
                                                        />
                                                        <span className="absolute -top-4 right-0 font-mono text-[10px] text-muted-foreground">
                                                            {formatDuration(songsDuration)} / {set.duration_minutes}:00
                                                        </span>
                                                    </div>
                                                )}

                                                {set.notes && (
                                                    <div className="mt-3 flex items-start gap-1.5 border-t border-border pt-3 text-xs text-muted-foreground">
                                                        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                        {set.notes}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Setlist déployée */}
                                            {isExpanded && (
                                                <div className="mt-2 overflow-hidden rounded-md border border-border bg-card animate-in fade-in slide-in-from-top-1 duration-200">
                                                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                                                        <h4 className="font-display text-sm font-semibold tracking-normal text-cream">
                                                            Setlist
                                                        </h4>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setActiveSongSetId(set.id);
                                                                setEditSong(null);
                                                                setShowSongModal(true);
                                                            }}
                                                        >
                                                            <Plus className="h-3.5 w-3.5" />
                                                            Chanson
                                                        </Button>
                                                    </div>

                                                    {setSongs.length === 0 ? (
                                                        <div className="px-4 py-5 text-center text-sm text-muted-foreground">
                                                            Aucune chanson — ajoute la première.
                                                        </div>
                                                    ) : (
                                                        <div className="py-1">
                                                            {setSongs.map((song, songIdx) => (
                                                                <div key={song.id} className="group flex items-center gap-3 px-4 py-2 transition-colors hover:bg-panel/60">
                                                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-panel font-mono text-[11px] font-bold text-muted-foreground">
                                                                        {songIdx + 1}
                                                                    </div>
                                                                    <div className="min-w-0 flex-1">
                                                                        <div className="text-sm font-semibold text-cream">{song.title}</div>
                                                                        {song.assignments && (
                                                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-signal">
                                                                                <Music className="h-3 w-3 shrink-0" />{song.assignments}
                                                                            </div>
                                                                        )}
                                                                        {song.notes && (
                                                                            <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                                                                                <MessageSquare className="h-3 w-3 shrink-0" />{song.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="shrink-0 font-mono text-sm font-semibold text-muted-foreground">
                                                                        {formatDuration(song.duration_seconds)}
                                                                    </div>
                                                                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                                                        <button
                                                                            className={iconBtn}
                                                                            onClick={() => handleMoveSong(set.id, song.id, -1)}
                                                                            disabled={songIdx === 0}
                                                                        ><ChevronUp className="h-4 w-4" /></button>
                                                                        <button
                                                                            className={iconBtn}
                                                                            onClick={() => handleMoveSong(set.id, song.id, 1)}
                                                                            disabled={songIdx === setSongs.length - 1}
                                                                        ><ChevronDown className="h-4 w-4" /></button>
                                                                        <button
                                                                            className={iconBtn}
                                                                            onClick={() => {
                                                                                setActiveSongSetId(set.id);
                                                                                setEditSong(song);
                                                                                setShowSongModal(true);
                                                                            }}
                                                                        ><Pencil className="h-3.5 w-3.5" /></button>
                                                                        {isAdmin && (
                                                                            <button
                                                                                className={cn(iconBtn, 'hover:text-vu')}
                                                                                onClick={() => handleDeleteSong(song.id)}
                                                                                title="Supprimer la chanson"
                                                                            ><Trash2 className="h-3.5 w-3.5" /></button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Modales */}
            {showSetModal && (
                <SetModal
                    concertId={concert.id}
                    set={editSet}
                    groups={groups}
                    currentOrder={sets.length}
                    onClose={() => { setShowSetModal(false); setEditSet(null); }}
                    onSaved={() => { setShowSetModal(false); setEditSet(null); fetchSets(); onRefresh(); }}
                />
            )}

            {showSongModal && (
                <SongModal
                    setId={activeSongSetId}
                    song={editSong}
                    currentOrder={(songs[activeSongSetId] || []).length}
                    onClose={() => { setShowSongModal(false); setEditSong(null); }}
                    onSaved={() => { setShowSongModal(false); setEditSong(null); fetchSets(); }}
                />
            )}
        </div>
    );
}

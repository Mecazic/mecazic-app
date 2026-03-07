'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import SetModal from './SetModal';
import SongModal from './SongModal';

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

    return (
        <div className="concert-detail-page">
            {/* Header */}
            <div className="concert-detail-header">
                <button className="btn btn-ghost" onClick={onBack}>
                    ← Retour
                </button>
                <div className="concert-detail-title-block">
                    <h1 className="concert-detail-title">{concert.name}</h1>
                    <div className="concert-detail-subtitle">
                        <span>📅 {formattedDate}</span>
                        {concert.location && <span>📍 {concert.location}</span>}
                    </div>
                    {concert.description && (
                        <p className="concert-detail-description">{concert.description}</p>
                    )}
                </div>
            </div>

            {/* Stats bar */}
            <div className="concert-stats-bar">
                <div className="concert-stat">
                    <span className="concert-stat-value">{sets.length}</span>
                    <span className="concert-stat-label">Passage{sets.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="concert-stat">
                    <span className="concert-stat-value">{totalSongs}</span>
                    <span className="concert-stat-label">Chanson{totalSongs !== 1 ? 's' : ''}</span>
                </div>
                <div className="concert-stat">
                    <span className="concert-stat-value">{totalDuration}</span>
                    <span className="concert-stat-label">min totales</span>
                </div>
            </div>

            {/* Progress bar */}
            {sets.length > 0 && (
                <div className="concert-progress">
                    <div className="concert-progress-bar">
                        {sets.map((set, i) => {
                            const width = totalDuration > 0
                                ? (set.duration_minutes / totalDuration) * 100
                                : 100 / sets.length;
                            return (
                                <div
                                    key={set.id}
                                    className="concert-progress-segment"
                                    style={{
                                        width: `${width}%`,
                                        backgroundColor: set.groups?.color || '#666',
                                    }}
                                    title={`${set.groups?.name}: ${set.duration_minutes} min`}
                                ></div>
                            );
                        })}
                    </div>
                    <div className="concert-progress-labels">
                        {sets.map(set => (
                            <span key={set.id} style={{ color: set.groups?.color || '#666' }}>
                                {set.groups?.name}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Timeline */}
            {loading ? (
                <div className="flex-center" style={{ padding: '60px 0' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="concert-timeline">
                    <div className="concert-timeline-header">
                        <h2>Programme</h2>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => { setEditSet(null); setShowSetModal(true); }}
                        >
                            + Ajouter un passage
                        </button>
                    </div>

                    {sets.length === 0 ? (
                        <div className="empty-state" style={{ padding: '40px' }}>
                            <div className="empty-state-icon">🎸</div>
                            <h3>Aucun passage prévu</h3>
                            <p className="text-muted">Ajoute le premier groupe au programme !</p>
                        </div>
                    ) : (
                        <div className="timeline-list">
                            {sets.map((set, index) => {
                                const setSongs = songs[set.id] || [];
                                const isExpanded = expandedSet === set.id;
                                const songsDuration = getSetSongsDuration(set.id);
                                const fillPercent = set.duration_minutes > 0
                                    ? Math.min(100, (songsDuration / 60 / set.duration_minutes) * 100)
                                    : 0;

                                return (
                                    <div key={set.id} className="timeline-item">
                                        <div className="timeline-connector">
                                            <div
                                                className="timeline-dot"
                                                style={{ backgroundColor: set.groups?.color || '#666' }}
                                            ></div>
                                            {index < sets.length - 1 && (
                                                <div className="timeline-line"></div>
                                            )}
                                        </div>

                                        <div className="timeline-content">
                                            <div
                                                className="timeline-card"
                                                style={{ '--set-color': set.groups?.color || '#666' }}
                                                onClick={() => setExpandedSet(isExpanded ? null : set.id)}
                                            >
                                                <div className="timeline-card-header">
                                                    <div className="timeline-card-info">
                                                        <div className="timeline-card-time">
                                                            {formatTime(set.start_time)}
                                                        </div>
                                                        <div>
                                                            <div className="timeline-card-group">
                                                                <span
                                                                    className="timeline-group-color"
                                                                    style={{ backgroundColor: set.groups?.color || '#666' }}
                                                                ></span>
                                                                {set.groups?.name || 'Groupe inconnu'}
                                                            </div>
                                                            <div className="timeline-card-meta">
                                                                {set.duration_minutes} min · {setSongs.length} chanson{setSongs.length !== 1 ? 's' : ''}
                                                                {songsDuration > 0 && (
                                                                    <span className="text-muted"> · {formatDuration(songsDuration)} de musique</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="timeline-card-actions">
                                                        <button
                                                            className="btn btn-ghost btn-icon btn-sm"
                                                            onClick={(e) => { e.stopPropagation(); handleMoveSet(set.id, -1); }}
                                                            disabled={index === 0}
                                                            title="Monter"
                                                        >↑</button>
                                                        <button
                                                            className="btn btn-ghost btn-icon btn-sm"
                                                            onClick={(e) => { e.stopPropagation(); handleMoveSet(set.id, 1); }}
                                                            disabled={index === sets.length - 1}
                                                            title="Descendre"
                                                        >↓</button>
                                                        <button
                                                            className="btn btn-ghost btn-icon btn-sm"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditSet(set);
                                                                setShowSetModal(true);
                                                            }}
                                                            title="Modifier"
                                                        >✏️</button>
                                                        {isAdmin && (
                                                            <button
                                                                className="btn btn-ghost btn-icon btn-sm text-danger"
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSet(set.id); }}
                                                                title="Supprimer"
                                                            >🗑️</button>
                                                        )}
                                                        <span className={`timeline-expand-icon ${isExpanded ? 'expanded' : ''}`}>
                                                            ▼
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* Duration fill bar */}
                                                {set.duration_minutes > 0 && (
                                                    <div className="timeline-fill-bar">
                                                        <div
                                                            className="timeline-fill-bar-inner"
                                                            style={{
                                                                width: `${fillPercent}%`,
                                                                backgroundColor: set.groups?.color || '#666',
                                                            }}
                                                        ></div>
                                                        <span className="timeline-fill-label">
                                                            {formatDuration(songsDuration)} / {set.duration_minutes}:00
                                                        </span>
                                                    </div>
                                                )}

                                                {set.notes && (
                                                    <div className="timeline-card-notes">💬 {set.notes}</div>
                                                )}
                                            </div>

                                            {/* Expanded setlist */}
                                            {isExpanded && (
                                                <div className="setlist-panel">
                                                    <div className="setlist-header">
                                                        <h4>Setlist</h4>
                                                        <button
                                                            className="btn btn-sm btn-secondary"
                                                            onClick={() => {
                                                                setActiveSongSetId(set.id);
                                                                setEditSong(null);
                                                                setShowSongModal(true);
                                                            }}
                                                        >
                                                            + Chanson
                                                        </button>
                                                    </div>

                                                    {setSongs.length === 0 ? (
                                                        <div className="text-muted text-center" style={{ padding: '20px', fontSize: '0.85rem' }}>
                                                            Aucune chanson — ajoute la première !
                                                        </div>
                                                    ) : (
                                                        <div className="setlist-songs">
                                                            {setSongs.map((song, songIdx) => (
                                                                <div key={song.id} className="song-row">
                                                                    <div className="song-order">{songIdx + 1}</div>
                                                                    <div className="song-info">
                                                                        <div className="song-title">{song.title}</div>
                                                                        {song.assignments && (
                                                                            <div className="song-assignments">
                                                                                🎵 {song.assignments}
                                                                            </div>
                                                                        )}
                                                                        {song.notes && (
                                                                            <div className="song-notes">
                                                                                💬 {song.notes}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="song-duration">
                                                                        {formatDuration(song.duration_seconds)}
                                                                    </div>
                                                                    <div className="song-actions">
                                                                        <button
                                                                            className="btn btn-ghost btn-icon btn-sm"
                                                                            onClick={() => handleMoveSong(set.id, song.id, -1)}
                                                                            disabled={songIdx === 0}
                                                                        >↑</button>
                                                                        <button
                                                                            className="btn btn-ghost btn-icon btn-sm"
                                                                            onClick={() => handleMoveSong(set.id, song.id, 1)}
                                                                            disabled={songIdx === setSongs.length - 1}
                                                                        >↓</button>
                                                                        <button
                                                                            className="btn btn-ghost btn-icon btn-sm"
                                                                            onClick={() => {
                                                                                setActiveSongSetId(set.id);
                                                                                setEditSong(song);
                                                                                setShowSongModal(true);
                                                                            }}
                                                                        >✏️</button>
                                                                        {isAdmin && (
                                                                            <button
                                                                                className="btn btn-ghost btn-icon btn-sm text-danger"
                                                                                onClick={() => handleDeleteSong(song.id)}
                                                                                title="Supprimer la chanson"
                                                                            >🗑️</button>
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

            {/* Modals */}
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

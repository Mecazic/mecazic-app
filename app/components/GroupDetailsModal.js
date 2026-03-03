'use client';

import { useState } from 'react';
import AddRepertoireSongModal from './AddRepertoireSongModal';
import SongDetailsModal from './SongDetailsModal';

export default function GroupDetailsModal({ group, members, reservations, repertoire = [], isMyGroup, onJoin, onLeave, onClose, onRepertoireChange }) {
    const [showAddSong, setShowAddSong] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);

    if (!group) return null;

    const getEndTime = (startTime, duration) => {
        const [h, m] = startTime.split(':').map(Number);
        const total = h * 60 + m + duration;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    };

    return (
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 100 }}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
                <div className="modal-header" style={{ borderBottom: `2px solid ${group.color}40`, paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                            className="group-card-color"
                            style={{
                                backgroundColor: group.color + '20',
                                color: group.color,
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.5rem'
                            }}
                        >
                            🎵
                        </div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.4rem' }}>{group.name}</h2>
                            {group.description && (
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
                                    {group.description}
                                </div>
                            )}
                        </div>
                    </div>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto', padding: '1.5rem 0' }}>

                    {/* Members Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>👥</span> Membres du groupe ({members.length})
                        </h3>

                        {members.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {members.map(m => (
                                    <div
                                        key={m.id}
                                        style={{
                                            padding: '12px 16px',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '12px',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <div style={{
                                            width: '32px',
                                            height: '32px',
                                            borderRadius: '50%',
                                            backgroundColor: group.color + '40',
                                            color: group.color,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            textTransform: 'uppercase'
                                        }}>
                                            {m.username.charAt(0)}
                                        </div>
                                        <div style={{ fontWeight: 500 }}>{m.username}</div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted" style={{ fontStyle: 'italic', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                Aucun membre dans ce groupe pour le moment.
                            </div>
                        )}
                    </div>

                    {/* Reservations Section */}
                    <div style={{ marginBottom: '2rem' }}>
                        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.2rem' }}>📅</span> Réservations à venir ({reservations.length})
                        </h3>

                        {reservations.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {reservations.map(r => (
                                    <div
                                        key={r.id}
                                        style={{
                                            padding: '12px 16px',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)'
                                        }}
                                    >
                                        <div style={{ fontWeight: 600, marginBottom: '4px' }}>{r.title || 'Répétition'}</div>
                                        <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.9rem' }}>
                                            <span>🗓️ {formatDate(r.date)}</span>
                                            <span>•</span>
                                            <span>🕒 {r.start_time.slice(0, 5)} - {getEndTime(r.start_time, r.duration)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted" style={{ fontStyle: 'italic', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                Aucune réservation prévue.
                            </div>
                        )}
                    </div>

                    {/* Repertoire Section */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1.2rem' }}>🎸</span> Répertoire ({repertoire.length})
                            </h3>
                            {isMyGroup && (
                                <button className="btn btn-primary btn-sm" onClick={() => setShowAddSong(true)}>
                                    ＋ Ajouter
                                </button>
                            )}
                        </div>

                        {repertoire.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {repertoire.map(song => (
                                    <div
                                        key={song.id}
                                        onClick={() => setSelectedSong(song)}
                                        style={{
                                            padding: '12px 16px',
                                            backgroundColor: 'var(--bg-tertiary)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--border-color)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            transition: 'background-color 0.2s',
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                                    >
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: '1.05rem' }}>{song.title}</div>
                                            <div className="text-muted" style={{ fontSize: '0.9rem' }}>{song.artist}</div>
                                        </div>
                                        <div>
                                            {song.youtube_url && <span title="Vidéo YouTube incluse" style={{ marginRight: '8px' }}>▶️</span>}
                                            {song.lyrics && <span title="Paroles disponibles">📝</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-muted" style={{ fontStyle: 'italic', padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                                Aucun morceau dans le répertoire.
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.2rem', gap: '1rem' }}>
                    {isMyGroup ? (
                        <button
                            className="btn btn-danger"
                            onClick={() => {
                                onLeave();
                                onClose();
                            }}
                            style={{ flex: 1 }}
                        >
                            Quitter le groupe
                        </button>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={() => {
                                onJoin(group.id);
                                onClose();
                            }}
                            style={{ flex: 1, backgroundColor: group.color, borderColor: group.color, color: 'white' }}
                        >
                            Rejoindre ce groupe
                        </button>
                    )}
                    <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>
                        Fermer
                    </button>
                </div>
            </div>

            {/* Modals for Repertoire */}
            {showAddSong && (
                <AddRepertoireSongModal
                    groupId={group.id}
                    onClose={() => setShowAddSong(false)}
                    onSaved={() => {
                        setShowAddSong(false);
                        if (onRepertoireChange) onRepertoireChange();
                    }}
                />
            )}

            {selectedSong && (
                <SongDetailsModal
                    song={selectedSong}
                    onClose={() => setSelectedSong(null)}
                    onUpdated={() => {
                        if (onRepertoireChange) onRepertoireChange();
                        // Close modal if deleted, otherwise keep open to show updated lyrics
                        if (onRepertoireChange) {
                            // Fetch isn't synchronous so song might refer to old data immediately
                            // But usually users close it themselves after editing
                        }
                    }}
                />
            )}
        </div>
    );
}

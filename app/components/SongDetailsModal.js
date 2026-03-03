'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export default function SongDetailsModal({ song, onClose, onUpdated }) {
    const [isEditingLyrics, setIsEditingLyrics] = useState(false);
    const [lyricsContent, setLyricsContent] = useState(song?.lyrics || '');
    const [saving, setSaving] = useState(false);
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    const handleSaveLyrics = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('group_repertoire')
                .update({ lyrics: lyricsContent })
                .eq('id', song.id);

            if (error) throw error;
            setIsEditingLyrics(false);
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Es-tu sûr de vouloir supprimer "${song.title}" du répertoire ?`)) return;

        try {
            const { error } = await supabase
                .from('group_repertoire')
                .delete()
                .eq('id', song.id);

            if (error) throw error;
            onClose();
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to get video ID
    const getYoutubeEmbed = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeEmbed(song?.youtube_url);
    const searchQuery = encodeURIComponent(`${song?.artist} ${song?.title}`);

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal modal-lg" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px' }}>
                <div className="modal-header">
                    <div>
                        <h2 style={{ marginBottom: '4px' }}>{song?.title}</h2>
                        <div className="text-muted">{song?.artist}</div>
                    </div>
                    <div className="flex gap-sm">
                        {isAdmin && (
                            <button className="btn btn-ghost btn-sm btn-icon text-danger" onClick={handleDelete} title="Supprimer la chanson">🗑️</button>
                        )}
                        <button className="btn btn-ghost btn-sm btn-icon" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>

                    {/* Media Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--space-lg)' }}>
                        <div className="card" style={{ padding: '0', overflow: 'hidden', backgroundColor: 'var(--bg-tertiary)' }}>
                            {videoId ? (
                                <iframe
                                    width="100%"
                                    height="250"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    style={{ display: 'block' }}
                                ></iframe>
                            ) : (
                                <div className="flex-center" style={{ height: '250px', flexDirection: 'column', gap: 'var(--space-md)' }}>
                                    <div style={{ fontSize: '2rem' }}>🎵</div>
                                    <div className="text-muted">Aucun lien YouTube défini</div>
                                    <a
                                        href={`https://www.youtube.com/results?search_query=${searchQuery}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="btn btn-secondary btn-sm"
                                    >
                                        Rechercher sur YouTube ↗
                                    </a>
                                </div>
                            )}
                        </div>

                        {/* Actions / Chords */}
                        <div className="flex" style={{ flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Partitions et Tablatures</h3>
                            <a
                                href={`https://www.songsterr.com/a/wa/bestMatchForQueryString?s=${encodeURIComponent(song?.title)}&a=${encodeURIComponent(song?.artist)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ justifyContent: 'center', backgroundColor: '#eab308', color: '#1a1a1a', border: 'none' }}
                            >
                                🎸 Ouvrir dans Songsterr ↗
                            </a>
                            <a
                                href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${searchQuery}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary"
                                style={{ justifyContent: 'center' }}
                            >
                                🎼 Ouvrir dans Ultimate Guitar ↗
                            </a>
                        </div>
                    </div>

                    {/* Lyrics Section */}
                    <div>
                        <div className="flex" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                            <h3 style={{ fontSize: '1.1rem', margin: 0 }}>Paroles</h3>
                            {!isEditingLyrics ? (
                                <button className="btn btn-ghost btn-sm" onClick={() => setIsEditingLyrics(true)}>✏️ Modifier</button>
                            ) : (
                                <div className="flex gap-sm">
                                    <button className="btn btn-ghost btn-sm" onClick={() => { setIsEditingLyrics(false); setLyricsContent(song?.lyrics || ''); }}>Annuler</button>
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveLyrics} disabled={saving}>{saving ? '...' : 'Enregistrer'}</button>
                                </div>
                            )}
                        </div>

                        <div className="card" style={{ backgroundColor: 'var(--bg-tertiary)', padding: 'var(--space-lg)', maxHeight: '400px', overflowY: 'auto' }}>
                            {isEditingLyrics ? (
                                <textarea
                                    className="form-input"
                                    value={lyricsContent}
                                    onChange={(e) => setLyricsContent(e.target.value)}
                                    rows={15}
                                    style={{ fontFamily: 'monospace', minHeight: '300px' }}
                                />
                            ) : lyricsContent ? (
                                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', fontFamily: 'serif', fontSize: '1.05rem' }}>
                                    {lyricsContent}
                                </div>
                            ) : (
                                <div className="text-muted italic flex-center" style={{ height: '100px' }}>
                                    Aucune parole disponible pour ce morceau.
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

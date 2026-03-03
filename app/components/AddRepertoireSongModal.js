'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddRepertoireSongModal({ groupId, onClose, onSaved }) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchLyrics = async (artistName, songTitle) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

            const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(songTitle)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const data = await res.json();
            return data.lyrics;
        } catch (err) {
            console.error('Error fetching lyrics:', err);
            return null;
        }
    };

    const extractYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !artist.trim()) {
            setError('Le titre et l\'artiste sont obligatoires.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Try fetching lyrics
            const lyrics = await fetchLyrics(artist.trim(), title.trim());

            // Validate YouTube URL
            if (youtubeUrl && !extractYoutubeId(youtubeUrl)) {
                setError('Le lien YouTube n\'est pas valide.');
                setSaving(false);
                return;
            }

            const payload = {
                group_id: groupId,
                title: title.trim(),
                artist: artist.trim(),
                youtube_url: youtubeUrl.trim() || null,
                lyrics: lyrics || null,
            };

            const { error: err } = await supabase
                .from('group_repertoire')
                .insert(payload);

            if (err) throw err;
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Ajouter au répertoire</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Titre du morceau *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Zombie"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Artiste / Groupe *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={artist}
                                onChange={(e) => setArtist(e.target.value)}
                                placeholder="Ex: The Cranberries"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Lien YouTube (optionnel)</label>
                            <input
                                type="url"
                                className="form-input"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                            <small className="text-muted" style={{ display: 'block', marginTop: '4px' }}>
                                Laisse vide pour générer automatiquement une recherche YouTube.
                            </small>
                        </div>

                        {error && <div className="form-error">⚠️ {error}</div>}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Ajout en cours...' : 'Ajouter'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

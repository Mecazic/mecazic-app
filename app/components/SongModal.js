'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SongModal({ setId, song, currentOrder, onClose, onSaved }) {
    const [title, setTitle] = useState(song?.title || '');
    const [minutes, setMinutes] = useState(song ? Math.floor(song.duration_seconds / 60) : 3);
    const [seconds, setSeconds] = useState(song ? song.duration_seconds % 60 : 0);
    const [assignments, setAssignments] = useState(song?.assignments || '');
    const [notes, setNotes] = useState(song?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Le titre est obligatoire.');
            return;
        }

        setSaving(true);
        setError('');

        const durationSeconds = (minutes * 60) + seconds;

        try {
            const payload = {
                title: title.trim(),
                duration_seconds: durationSeconds,
                assignments: assignments.trim(),
                notes: notes.trim(),
            };

            if (song) {
                const { error: err } = await supabase
                    .from('set_songs')
                    .update(payload)
                    .eq('id', song.id);
                if (err) throw err;
            } else {
                const { error: err } = await supabase
                    .from('set_songs')
                    .insert({
                        ...payload,
                        set_id: setId,
                        song_order: currentOrder,
                    });
                if (err) throw err;
            }
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
                    <h2>{song ? 'Modifier la chanson' : 'Ajouter une chanson'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Titre de la chanson *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Highway to Hell"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Durée</label>
                            <div className="song-duration-input">
                                <div className="song-duration-field">
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={minutes}
                                        onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                        min="0"
                                        max="30"
                                    />
                                    <span className="song-duration-label">min</span>
                                </div>
                                <span className="song-duration-separator">:</span>
                                <div className="song-duration-field">
                                    <input
                                        type="number"
                                        className="form-input"
                                        value={seconds}
                                        onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                        min="0"
                                        max="59"
                                    />
                                    <span className="song-duration-label">sec</span>
                                </div>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Qui joue quoi ?</label>
                            <textarea
                                className="form-input"
                                value={assignments}
                                onChange={(e) => setAssignments(e.target.value)}
                                placeholder="Ex: Tom → guitare lead, Léa → chant, Max → batterie"
                                rows={2}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-input"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Remarques, tempo, tonalité..."
                                rows={2}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {error && <div className="form-error">⚠️ {error}</div>}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Enregistrement...' : (song ? 'Modifier' : 'Ajouter')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

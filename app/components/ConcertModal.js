'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConcertModal({ concert, onClose, onSaved, userId }) {
    const [name, setName] = useState(concert?.name || '');
    const [date, setDate] = useState(concert?.date || '');
    const [location, setLocation] = useState(concert?.location || '');
    const [description, setDescription] = useState(concert?.description || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !date) {
            setError('Le nom et la date sont obligatoires.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            if (concert) {
                // Update
                const { error: err } = await supabase
                    .from('concerts')
                    .update({ name: name.trim(), date, location: location.trim(), description: description.trim() })
                    .eq('id', concert.id);
                if (err) throw err;
            } else {
                // Create
                const { error: err } = await supabase
                    .from('concerts')
                    .insert({
                        name: name.trim(),
                        date,
                        location: location.trim(),
                        description: description.trim(),
                        created_by: userId,
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
                    <h2>{concert ? 'Modifier le concert' : 'Nouveau concert'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Nom du concert *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Concert de fin d'année"
                                autoFocus
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Date *</label>
                            <input
                                type="date"
                                className="form-input"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Lieu</label>
                            <input
                                type="text"
                                className="form-input"
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Ex: Amphi ISAE-Supmeca"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Description</label>
                            <textarea
                                className="form-input"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Infos supplémentaires..."
                                rows={3}
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
                            {saving ? 'Enregistrement...' : (concert ? 'Modifier' : 'Créer')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

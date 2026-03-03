'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function SetModal({ concertId, set, groups, currentOrder, onClose, onSaved }) {
    const [groupId, setGroupId] = useState(set?.group_id || '');
    const [startTime, setStartTime] = useState(set?.start_time?.slice(0, 5) || '');
    const [durationMinutes, setDurationMinutes] = useState(set?.duration_minutes || 30);
    const [notes, setNotes] = useState(set?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupId) {
            setError('Sélectionne un groupe.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const payload = {
                group_id: groupId,
                start_time: startTime || null,
                duration_minutes: durationMinutes,
                notes: notes.trim(),
            };

            if (set) {
                const { error: err } = await supabase
                    .from('concert_sets')
                    .update(payload)
                    .eq('id', set.id);
                if (err) throw err;
            } else {
                const { error: err } = await supabase
                    .from('concert_sets')
                    .insert({
                        ...payload,
                        concert_id: concertId,
                        set_order: currentOrder,
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

    const durationOptions = [15, 20, 30, 45, 60, 90, 120];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>{set ? 'Modifier le passage' : 'Ajouter un passage'}</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Groupe *</label>
                            <select
                                className="form-select"
                                value={groupId}
                                onChange={(e) => setGroupId(e.target.value)}
                            >
                                <option value="">Sélectionner un groupe...</option>
                                {groups.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {g.name}
                                    </option>
                                ))}
                            </select>
                            {/* Group color preview */}
                            {groupId && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                                    <span
                                        style={{
                                            width: '12px',
                                            height: '12px',
                                            borderRadius: '50%',
                                            backgroundColor: groups.find(g => g.id === groupId)?.color || '#666',
                                        }}
                                    ></span>
                                    <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                                        {groups.find(g => g.id === groupId)?.description || ''}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Heure de début</label>
                            <input
                                type="time"
                                className="form-input"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Durée du passage</label>
                            <div className="set-duration-grid">
                                {durationOptions.map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        className={`set-duration-chip ${durationMinutes === d ? 'selected' : ''}`}
                                        onClick={() => setDurationMinutes(d)}
                                    >
                                        {d} min
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <textarea
                                className="form-input"
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Infos supplémentaires sur le passage..."
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
                            {saving ? 'Enregistrement...' : (set ? 'Modifier' : 'Ajouter')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

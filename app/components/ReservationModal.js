'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ReservationModal({ slot, onClose, onCreated }) {
    const { user, profile } = useAuth();
    const [title, setTitle] = useState('Répétition');
    const [duration, setDuration] = useState(60);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedGroupId, setSelectedGroupId] = useState(() =>
        profile?.groups?.length > 0 ? profile.groups[0].id : ''
    );

    // Prochain créneau plein : la date ET l'heure viennent du même objet,
    // sinon à 23h le défaut devient 00:00 du même jour (dans le passé)
    const [customDate, setCustomDate] = useState(() => {
        if (slot) return slot.date;
        const d = new Date();
        d.setHours(d.getHours() + 1);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    });

    const [customTime, setCustomTime] = useState(() => {
        if (slot) return slot.startTime;
        const d = new Date();
        d.setHours(d.getHours() + 1);
        return `${String(d.getHours()).padStart(2, '0')}:00`;
    });

    const activeDate = slot ? slot.date : customDate;
    const activeTime = slot ? slot.startTime : customTime;

    const durations = [
        { value: 30, label: '30 min' },
        { value: 60, label: '1h' },
        { value: 120, label: '2h' },
        { value: 240, label: '4h' },
    ];

    const getEndTime = () => {
        const [h, m] = activeTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + duration;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!profile?.groups || profile.groups.length === 0) {
            setError('Tu dois rejoindre un groupe avant de réserver.');
            return;
        }
        if (!selectedGroupId) {
            setError('Sélectionnez un groupe pour la réservation.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Check if slot is in the past
            const now = new Date();
            const slotDate = new Date(`${activeDate}T${activeTime}`);
            if (slotDate < now && !slot) {
                setError('La réservation ne peut pas être dans le passé.');
                setLoading(false);
                return;
            }

            // Check for conflicts
            const endTime = getEndTime();
            const { data: conflicts } = await supabase
                .from('reservations')
                .select('id, start_time, duration, groups(name)')
                .eq('date', activeDate);

            const [startH, startM] = activeTime.split(':').map(Number);
            const newStart = startH * 60 + startM;
            const newEnd = newStart + duration;

            const conflict = (conflicts || []).find(r => {
                const [rH, rM] = r.start_time.split(':').map(Number);
                const rStart = rH * 60 + rM;
                const rEnd = rStart + r.duration;
                return newStart < rEnd && newEnd > rStart;
            });

            if (conflict) {
                setError(`⚠️ Conflit avec une réservation de ${conflict.groups?.name || 'un groupe'}`);
                setLoading(false);
                return;
            }

            // Check end time doesn't exceed 23:00
            if (newEnd > 23 * 60) {
                setError('La réservation ne peut pas dépasser 23h00.');
                setLoading(false);
                return;
            }

            // Create reservation
            const { error: insertError } = await supabase
                .from('reservations')
                .insert({
                    group_id: selectedGroupId,
                    user_id: user.id,
                    title,
                    date: activeDate,
                    start_time: activeTime,
                    duration,
                });

            if (insertError) throw insertError;

            onCreated();
        } catch (err) {
            if (err.code === '23P01') {
                // Contrainte anti-chevauchement de la base (race condition)
                setError('⚠️ Ce créneau vient d\'être réservé par quelqu\'un d\'autre.');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const dateObj = new Date(activeDate + 'T00:00:00');
    const dateLabel = `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🎵 Nouvelle réservation</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Date & Time info */}
                        {slot ? (
                            <div className="card" style={{ background: 'var(--bg-tertiary)' }}>
                                <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                    <span style={{ fontSize: '1.5rem' }}>📆</span>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{dateLabel}</div>
                                        <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                            {activeTime} → {getEndTime()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex gap-md">
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Date</label>
                                    <input
                                        type="date"
                                        className="form-input"
                                        value={activeDate}
                                        onChange={(e) => setCustomDate(e.target.value)}
                                        min={new Date().toISOString().split('T')[0]}
                                        required
                                    />
                                </div>
                                <div className="form-group" style={{ flex: 1 }}>
                                    <label className="form-label">Heure de début</label>
                                    <input
                                        type="time"
                                        className="form-input"
                                        value={activeTime}
                                        onChange={(e) => setCustomTime(e.target.value)}
                                        step="1800"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Group info selection */}
                        {profile?.groups?.length > 0 && (
                            <div className="form-group">
                                <label className="form-label">Groupe</label>
                                {profile.groups.length === 1 ? (
                                    <div className="flex gap-md" style={{ alignItems: 'center' }}>
                                        <div
                                            className="badge badge-group"
                                            style={{ backgroundColor: profile.groups[0].color }}
                                        >
                                            {profile.groups[0].name}
                                        </div>
                                    </div>
                                ) : (
                                    <select
                                        className="form-input"
                                        value={selectedGroupId}
                                        onChange={(e) => setSelectedGroupId(e.target.value)}
                                        required
                                    >
                                        {profile.groups.map(g => (
                                            <option key={g.id} value={g.id}>
                                                {g.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        )}

                        {/* Title */}
                        <div className="form-group">
                            <label className="form-label">Titre</label>
                            <input
                                type="text"
                                className="form-input"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Ex: Répétition concert"
                                maxLength={50}
                            />
                        </div>

                        {/* Duration selector */}
                        <div className="form-group">
                            <label className="form-label">Durée</label>
                            <div className="duration-selector">
                                {durations.map((d) => (
                                    <button
                                        key={d.value}
                                        type="button"
                                        className={`duration-option ${duration === d.value ? 'selected' : ''}`}
                                        onClick={() => setDuration(d.value)}
                                    >
                                        <span className="duration-option-value">{d.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && (
                            <div className="form-error">
                                {error}
                            </div>
                        )}
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Annuler
                        </button>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading || !title.trim()}
                        >
                            {loading ? (
                                <>
                                    <span className="spinner"></span>
                                    Réservation...
                                </>
                            ) : (
                                '✓ Réserver'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

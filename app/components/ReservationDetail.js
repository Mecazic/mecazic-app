'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';

export default function ReservationDetail({ reservation, onClose, onDeleted }) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const isAdmin = profile?.role === 'admin';
    const canDelete = isAdmin;

    const handleDelete = async () => {
        if (!confirm('Supprimer cette réservation ?')) return;

        setLoading(true);
        const { error } = await supabase
            .from('reservations')
            .delete()
            .eq('id', reservation.id);

        if (!error) {
            onDeleted();
        }
        setLoading(false);
    };

    const getEndTime = (startTime, duration) => {
        const [h, m] = startTime.split(':').map(Number);
        const totalMinutes = h * 60 + m + duration;
        const endH = Math.floor(totalMinutes / 60);
        const endM = totalMinutes % 60;
        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
    };

    const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin',
        'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const dateObj = new Date(reservation.date + 'T00:00:00');
    const dateLabel = `${dayNames[dateObj.getDay()]} ${dateObj.getDate()} ${monthNames[dateObj.getMonth()]}`;

    const durationLabels = { 30: '30 min', 60: '1 heure', 120: '2 heures', 240: '4 heures' };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>🎵 Détails de la réservation</h2>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="reservation-detail">
                    <div className="reservation-detail-row">
                        <span className="reservation-detail-icon">📌</span>
                        <div>
                            <div className="reservation-detail-label">Titre</div>
                            <div className="reservation-detail-value">{reservation.title}</div>
                        </div>
                    </div>

                    <div className="reservation-detail-row">
                        <span className="reservation-detail-icon">🎸</span>
                        <div>
                            <div className="reservation-detail-label">Groupe</div>
                            <div className="reservation-detail-value">
                                <span
                                    className="badge badge-group"
                                    style={{ backgroundColor: reservation.groups?.color }}
                                >
                                    {reservation.groups?.name}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="reservation-detail-row">
                        <span className="reservation-detail-icon">📅</span>
                        <div>
                            <div className="reservation-detail-label">Date</div>
                            <div className="reservation-detail-value">{dateLabel}</div>
                        </div>
                    </div>

                    <div className="reservation-detail-row">
                        <span className="reservation-detail-icon">🕐</span>
                        <div>
                            <div className="reservation-detail-label">Horaire</div>
                            <div className="reservation-detail-value">
                                {reservation.start_time.slice(0, 5)} → {getEndTime(reservation.start_time, reservation.duration)}
                                <span className="text-muted" style={{ marginLeft: '8px', fontSize: '0.85rem' }}>
                                    ({durationLabels[reservation.duration]})
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="reservation-detail-row">
                        <span className="reservation-detail-icon">👤</span>
                        <div>
                            <div className="reservation-detail-label">Réservé par</div>
                            <div className="reservation-detail-value">
                                {reservation.profiles?.username || 'Inconnu'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
                    {canDelete && (
                        <button
                            className="btn btn-danger"
                            onClick={handleDelete}
                            disabled={loading}
                        >
                            {loading ? 'Suppression...' : '🗑️ Supprimer'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

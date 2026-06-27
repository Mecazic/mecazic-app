'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { CalendarDays, AlertCircle, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { DateField, TimeField } from '@/app/components/ui/date-time-field';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

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

        if (!activeDate || !activeTime) {
            setError('Renseigne une date et une heure complètes.');
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
                setError(`Conflit avec une réservation de ${conflict.groups?.name || 'un groupe'}.`);
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
                setError('Ce créneau vient d\'être réservé par quelqu\'un d\'autre.');
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

    const labelClass = 'font-mono text-[11px] uppercase tracking-wider text-muted-foreground';

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display uppercase tracking-tight text-cream">
                        Nouvelle réservation
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {/* Date & heure */}
                    {slot ? (
                        <div className="flex items-center gap-3 rounded-md border border-border bg-panel px-4 py-3">
                            <CalendarDays className="h-5 w-5 text-signal" />
                            <div>
                                <div className="font-semibold text-cream">{dateLabel}</div>
                                <div className="font-mono text-xs text-muted-foreground">
                                    {activeTime} → {getEndTime()}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <div className="flex flex-1 flex-col gap-1.5">
                                <label className={labelClass}>Date</label>
                                <DateField
                                    value={activeDate}
                                    onChange={setCustomDate}
                                    required
                                />
                            </div>
                            <div className="flex flex-1 flex-col gap-1.5">
                                <label className={labelClass}>Heure de début</label>
                                <TimeField
                                    value={activeTime}
                                    onChange={setCustomTime}
                                    required
                                />
                            </div>
                        </div>
                    )}

                    {/* Groupe */}
                    {profile?.groups?.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>Groupe</label>
                            {profile.groups.length === 1 ? (
                                <span
                                    className="w-fit rounded-full px-3 py-1 text-sm font-semibold text-white"
                                    style={{ backgroundColor: profile.groups[0].color }}
                                >
                                    {profile.groups[0].name}
                                </span>
                            ) : (
                                <select
                                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-cream outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
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

                    {/* Titre */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Titre</label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Répétition concert"
                            maxLength={50}
                        />
                    </div>

                    {/* Durée */}
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Durée</label>
                        <div className="grid grid-cols-4 gap-2">
                            {durations.map((d) => (
                                <button
                                    key={d.value}
                                    type="button"
                                    onClick={() => setDuration(d.value)}
                                    className={cn(
                                        'rounded-md border py-2 text-sm font-semibold transition-colors',
                                        duration === d.value
                                            ? 'border-signal bg-signal/15 text-signal'
                                            : 'border-border bg-panel text-muted-foreground hover:border-signal/50 hover:text-cream'
                                    )}
                                >
                                    {d.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-md border border-vu/30 bg-vu/10 px-3 py-2 text-sm text-vu">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={loading || !title.trim()}>
                            {loading ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Réservation…
                                </>
                            ) : (
                                'Réserver'
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

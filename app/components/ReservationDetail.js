'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Tag, Users, CalendarDays, Clock, User, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';

export default function ReservationDetail({ reservation, onClose, onDeleted }) {
    const { user, profile } = useAuth();
    const [loading, setLoading] = useState(false);

    const isAdmin = profile?.role === 'admin';
    const canDelete = isAdmin || user?.id === reservation.user_id;

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

    const Row = ({ icon: Icon, label, children }) => (
        <div className="flex items-start gap-3">
            <Icon className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
                <div className="font-medium text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
                <div className="mt-0.5 font-medium text-cream">{children}</div>
            </div>
        </div>
    );

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display tracking-normal text-cream">
                        Détails de la réservation
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-4">
                    <Row icon={Tag} label="Titre">{reservation.title}</Row>

                    <Row icon={Users} label="Groupe">
                        <span
                            className="inline-block rounded-full px-3 py-0.5 text-sm font-semibold text-white"
                            style={{ backgroundColor: reservation.groups?.color }}
                        >
                            {reservation.groups?.name}
                        </span>
                    </Row>

                    <Row icon={CalendarDays} label="Date">{dateLabel}</Row>

                    <Row icon={Clock} label="Horaire">
                        {reservation.start_time.slice(0, 5)} → {getEndTime(reservation.start_time, reservation.duration)}
                        <span className="ml-2 font-medium text-xs text-muted-foreground">
                            ({durationLabels[reservation.duration]})
                        </span>
                    </Row>

                    <Row icon={User} label="Réservé par">
                        {reservation.profiles?.username || 'Inconnu'}
                    </Row>
                </div>

                <div className="mt-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={onClose}>Fermer</Button>
                    {canDelete && (
                        <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                            <Trash2 className="h-4 w-4" />
                            {loading ? 'Suppression…' : 'Supprimer'}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

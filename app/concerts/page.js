'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import AppShell from '@/app/components/AppShell';
import LoginPage from '@/app/login/LoginPage';
import ConcertDetail from '@/app/components/ConcertDetail';
import ConcertModal from '@/app/components/ConcertModal';
import { cn } from '@/lib/utils';
import { Mic2, Plus, MapPin, Users, Clock, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';

export default function ConcertsPage() {
    const { user, profile, groups, loading: authLoading } = useAuth();
    const [concerts, setConcerts] = useState([]);
    const [concertSets, setConcertSets] = useState({});
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedConcert, setSelectedConcert] = useState(null);
    const [editConcert, setEditConcert] = useState(null);
    const isAdmin = profile?.role === 'admin';

    useEffect(() => {
        if (user) fetchConcerts();
    }, [user]);

    const fetchConcerts = async () => {
        setLoading(true);

        try {
            const { data: concertsData, error: concertError } = await supabase
                .from('concerts')
                .select('*')
                .order('date', { ascending: false });

            if (concertError) console.error("Error fetching concerts:", concertError);

            setConcerts(concertsData || []);

            // Fetch sets for all concerts
            const { data: setsData, error: setsError } = await supabase
                .from('concert_sets')
                .select('*, groups(name, color)')
                .order('set_order');

            if (setsError) console.error("Error fetching sets:", setsError);

            const setsMap = {};
            (setsData || []).forEach(s => {
                if (!setsMap[s.concert_id]) setsMap[s.concert_id] = [];
                setsMap[s.concert_id].push(s);
            });
            setConcertSets(setsMap);
        } catch (err) {
            console.error("Exception in fetchConcerts:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (concertId) => {
        if (!confirm('Supprimer ce concert et tous ses passages ?')) return;
        try {
            const { error } = await supabase.from('concerts').delete().eq('id', concertId);
            if (error) {
                console.error('Erreur suppression concert:', error);
                alert('Erreur lors de la suppression du concert : ' + error.message);
                return;
            }
            if (selectedConcert?.id === concertId) setSelectedConcert(null);
            fetchConcerts();
        } catch (err) {
            console.error('Exception handleDelete concert:', err);
            alert('Erreur inattendue lors de la suppression du concert.');
        }
    };

    if (authLoading) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-console">
                <Loader2 className="h-8 w-8 animate-spin text-signal" />
                <p className="text-sm text-muted-foreground">Chargement…</p>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const isUpcoming = (dateStr) => {
        return new Date(dateStr + 'T23:59:59') >= new Date();
    };

    const getTotalDuration = (sets) => {
        return (sets || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    };

    const upcomingConcerts = concerts.filter(c => isUpcoming(c.date));
    const pastConcerts = concerts.filter(c => !isUpcoming(c.date));

    const ConcertCard = ({ concert, past }) => {
        const sets = concertSets[concert.id] || [];
        const d = new Date(concert.date + 'T00:00:00');
        return (
            <div
                onClick={() => setSelectedConcert(concert)}
                className={cn(
                    'group glass relative flex cursor-pointer gap-4 rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl',
                    past && 'opacity-60 hover:opacity-90'
                )}
            >
                {/* Bloc date */}
                <div className={cn(
                    'flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-md border',
                    past ? 'border-border bg-panel' : 'border-signal/30 bg-signal/15'
                )}>
                    <span className={cn('font-mono text-xl font-extrabold leading-none', past ? 'text-cream' : 'text-signal')}>
                        {d.getDate()}
                    </span>
                    <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {monthNames[d.getMonth()]}
                    </span>
                </div>

                {/* Corps */}
                <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-base font-bold text-cream">{concert.name}</h3>
                    {concert.location && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />{concert.location}
                        </div>
                    )}
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />{sets.length} groupe{sets.length !== 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />{getTotalDuration(sets)} min
                        </span>
                    </div>
                    {!past && sets.length > 0 && (
                        <div className="mt-2 flex gap-1">
                            {sets.map(s => (
                                <span
                                    key={s.id}
                                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: s.groups?.color || '#666' }}
                                    title={s.groups?.name}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!past && (
                    <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                            className="flex h-7 w-7 items-center justify-center rounded-md bg-panel text-muted-foreground transition-colors hover:text-cream"
                            onClick={(e) => { e.stopPropagation(); setEditConcert(concert); setShowCreateModal(true); }}
                            title="Modifier"
                        ><Pencil className="h-3.5 w-3.5" /></button>
                        {isAdmin && (
                            <button
                                className="flex h-7 w-7 items-center justify-center rounded-md bg-panel text-muted-foreground transition-colors hover:text-vu"
                                onClick={(e) => { e.stopPropagation(); handleDelete(concert.id); }}
                                title="Supprimer"
                            ><Trash2 className="h-3.5 w-3.5" /></button>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <AppShell>
            {selectedConcert ? (
                <ConcertDetail
                    concert={selectedConcert}
                    onBack={() => setSelectedConcert(null)}
                    onRefresh={fetchConcerts}
                    groups={groups}
                    user={user}
                    profile={profile}
                />
            ) : (
                <>
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                        <h1 className="flex items-center gap-2.5 font-caps text-2xl font-extrabold uppercase tracking-normal text-cream">
                            <Mic2 className="h-6 w-6 text-signal" />
                            Concerts
                        </h1>
                        <Button onClick={() => { setEditConcert(null); setShowCreateModal(true); }}>
                            <Plus className="h-4 w-4" />
                            Nouveau concert
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="h-6 w-6 animate-spin text-signal" />
                        </div>
                    ) : concerts.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-16 text-center">
                            <Mic2 className="h-12 w-12 text-muted-foreground/40" />
                            <h3 className="font-semibold text-cream">Aucun concert organisé</h3>
                            <p className="text-sm text-muted-foreground">Crée ton premier concert pour commencer à planifier.</p>
                        </div>
                    ) : (
                        <>
                            {upcomingConcerts.length > 0 && (
                                <div className="mb-10">
                                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cream">
                                        <span className="h-2.5 w-2.5 rounded-full bg-chart-3 shadow-[0_0_8px_var(--chart-3)]" />
                                        À venir
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        {upcomingConcerts.map(concert => (
                                            <ConcertCard key={concert.id} concert={concert} past={false} />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {pastConcerts.length > 0 && (
                                <div className="mb-10">
                                    <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cream">
                                        <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                                        Passés
                                    </h2>
                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        {pastConcerts.map(concert => (
                                            <ConcertCard key={concert.id} concert={concert} past={true} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            )}

            {showCreateModal && (
                <ConcertModal
                    concert={editConcert}
                    onClose={() => { setShowCreateModal(false); setEditConcert(null); }}
                    onSaved={() => { setShowCreateModal(false); setEditConcert(null); fetchConcerts(); }}
                    userId={user.id}
                />
            )}
        </AppShell>
    );
}

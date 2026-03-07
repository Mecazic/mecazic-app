'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import LoginPage from '@/app/login/LoginPage';
import ConcertDetail from '@/app/components/ConcertDetail';
import ConcertModal from '@/app/components/ConcertModal';

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
            <div className="loading-page">
                <div className="spinner"></div>
                <p className="text-muted">Chargement...</p>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    };

    const isUpcoming = (dateStr) => {
        return new Date(dateStr + 'T23:59:59') >= new Date();
    };

    const getTotalDuration = (sets) => {
        return (sets || []).reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
    };

    const upcomingConcerts = concerts.filter(c => isUpcoming(c.date));
    const pastConcerts = concerts.filter(c => !isUpcoming(c.date));

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
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
                        <div className="page-header">
                            <h1>
                                <span className="page-header-icon">🎤</span>
                                Concerts
                            </h1>
                            <button
                                className="btn btn-primary"
                                onClick={() => { setEditConcert(null); setShowCreateModal(true); }}
                            >
                                <span>+</span> Nouveau concert
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex-center" style={{ padding: '80px 0' }}>
                                <div className="spinner"></div>
                            </div>
                        ) : concerts.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">🎤</div>
                                <h3>Aucun concert organisé</h3>
                                <p className="text-muted">Crée ton premier concert pour commencer à planifier !</p>
                            </div>
                        ) : (
                            <>
                                {/* Upcoming concerts */}
                                {upcomingConcerts.length > 0 && (
                                    <div className="concert-section">
                                        <h2 className="concert-section-title">
                                            <span className="concert-section-dot upcoming"></span>
                                            À venir
                                        </h2>
                                        <div className="concerts-grid">
                                            {upcomingConcerts.map(concert => {
                                                const sets = concertSets[concert.id] || [];
                                                return (
                                                    <div
                                                        key={concert.id}
                                                        className="concert-card upcoming"
                                                        onClick={() => setSelectedConcert(concert)}
                                                    >
                                                        <div className="concert-card-date">
                                                            <span className="concert-card-day">
                                                                {new Date(concert.date + 'T00:00:00').getDate()}
                                                            </span>
                                                            <span className="concert-card-month">
                                                                {monthNames[new Date(concert.date + 'T00:00:00').getMonth()]}
                                                            </span>
                                                        </div>
                                                        <div className="concert-card-body">
                                                            <h3 className="concert-card-name">{concert.name}</h3>
                                                            {concert.location && (
                                                                <div className="concert-card-location">
                                                                    📍 {concert.location}
                                                                </div>
                                                            )}
                                                            <div className="concert-card-meta">
                                                                <span className="concert-card-tag">
                                                                    🎸 {sets.length} groupe{sets.length !== 1 ? 's' : ''}
                                                                </span>
                                                                <span className="concert-card-tag">
                                                                    ⏱ {getTotalDuration(sets)} min
                                                                </span>
                                                            </div>
                                                            {sets.length > 0 && (
                                                                <div className="concert-card-groups">
                                                                    {sets.map(s => (
                                                                        <span
                                                                            key={s.id}
                                                                            className="concert-card-group-dot"
                                                                            style={{ backgroundColor: s.groups?.color || '#666' }}
                                                                            title={s.groups?.name}
                                                                        ></span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="concert-card-actions">
                                                            <button
                                                                className="btn btn-ghost btn-icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditConcert(concert);
                                                                    setShowCreateModal(true);
                                                                }}
                                                                title="Modifier"
                                                            >✏️</button>
                                                            {isAdmin && (
                                                                <button
                                                                    className="btn btn-ghost btn-icon"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDelete(concert.id);
                                                                    }}
                                                                    title="Supprimer"
                                                                >🗑️</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Past concerts */}
                                {pastConcerts.length > 0 && (
                                    <div className="concert-section">
                                        <h2 className="concert-section-title">
                                            <span className="concert-section-dot past"></span>
                                            Passés
                                        </h2>
                                        <div className="concerts-grid">
                                            {pastConcerts.map(concert => {
                                                const sets = concertSets[concert.id] || [];
                                                return (
                                                    <div
                                                        key={concert.id}
                                                        className="concert-card past"
                                                        onClick={() => setSelectedConcert(concert)}
                                                    >
                                                        <div className="concert-card-date">
                                                            <span className="concert-card-day">
                                                                {new Date(concert.date + 'T00:00:00').getDate()}
                                                            </span>
                                                            <span className="concert-card-month">
                                                                {monthNames[new Date(concert.date + 'T00:00:00').getMonth()]}
                                                            </span>
                                                        </div>
                                                        <div className="concert-card-body">
                                                            <h3 className="concert-card-name">{concert.name}</h3>
                                                            {concert.location && (
                                                                <div className="concert-card-location">
                                                                    📍 {concert.location}
                                                                </div>
                                                            )}
                                                            <div className="concert-card-meta">
                                                                <span className="concert-card-tag">
                                                                    🎸 {sets.length} groupe{sets.length !== 1 ? 's' : ''}
                                                                </span>
                                                                <span className="concert-card-tag">
                                                                    ⏱ {getTotalDuration(sets)} min
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
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
            </main>
        </div>
    );
}

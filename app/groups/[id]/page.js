'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import AppShell from '@/app/components/AppShell';
import LoginPage from '@/app/login/LoginPage';
import Avatar from '@/app/components/Avatar';
import AddRepertoireSongModal from '@/app/components/AddRepertoireSongModal';
import SongDetailsModal from '@/app/components/SongDetailsModal';

const GROUP_COLORS = [
    { color: '#8B5CF6', label: 'Violet' },
    { color: '#F59E0B', label: 'Ambre' },
    { color: '#10B981', label: 'Émeraude' },
    { color: '#EF4444', label: 'Rouge' },
    { color: '#3B82F6', label: 'Bleu' },
    { color: '#EC4899', label: 'Rose' },
    { color: '#F97316', label: 'Orange' },
    { color: '#06B6D4', label: 'Cyan' },
];

export default function GroupPage() {
    const { id } = useParams();
    const router = useRouter();
    const { user, profile, loading: authLoading, fetchProfile, fetchGroups } = useAuth();

    const [group, setGroup] = useState(null);
    const [members, setMembers] = useState([]);
    const [reservations, setReservations] = useState([]);
    const [repertoire, setRepertoire] = useState([]);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    const [showAddSong, setShowAddSong] = useState(false);
    const [selectedSong, setSelectedSong] = useState(null);
    const [showEdit, setShowEdit] = useState(false);
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editColor, setEditColor] = useState('#8B5CF6');
    const [editError, setEditError] = useState('');
    const [saving, setSaving] = useState(false);

    const fetchAll = useCallback(async () => {
        if (!id) return;
        try {
            const today = new Date().toISOString().split('T')[0];
            const [groupRes, membersRes, resaRes, repRes] = await Promise.all([
                supabase.from('groups').select('*').eq('id', id).single(),
                supabase.from('group_members').select('role, profiles(id, username)').eq('group_id', id),
                supabase.from('reservations').select('*').eq('group_id', id).gte('date', today).order('date').order('start_time').limit(10),
                supabase.from('group_repertoire').select('*').eq('group_id', id).order('title'),
            ]);

            if (groupRes.error || !groupRes.data) {
                setNotFound(true);
                return;
            }
            setGroup(groupRes.data);
            setMembers((membersRes.data || []).filter(m => m.profiles).map(m => ({ ...m.profiles, role: m.role })));
            setReservations(resaRes.data || []);
            setRepertoire(repRes.data || []);
        } catch (err) {
            console.error('Erreur chargement groupe:', err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (user) fetchAll();
    }, [user, fetchAll]);

    if (authLoading) {
        return (
            <div className="loading-page">
                <div className="spinner"></div>
                <p className="text-muted">Chargement...</p>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const isMyGroup = profile?.groups?.some(g => g.id === id);
    const myMembership = profile?.groups?.find(g => g.id === id);
    const canEdit = profile?.role === 'admin'
        || group?.created_by === user.id
        || myMembership?.role === 'admin';

    const handleJoin = async () => {
        try {
            const { error } = await supabase
                .from('group_members')
                .insert({ user_id: user.id, group_id: id, role: 'member' });
            if (error && error.code !== '23505') {
                alert('Erreur en rejoignant le groupe : ' + error.message);
                return;
            }
            await supabase.from('profiles').update({ group_id: id }).eq('id', user.id);
            await fetchProfile(user.id);
            await fetchAll();
        } catch (err) {
            console.error('Erreur join:', err);
        }
    };

    const handleLeave = async () => {
        try {
            const { error } = await supabase
                .from('group_members')
                .delete()
                .eq('user_id', user.id)
                .eq('group_id', id);
            if (error) {
                alert('Erreur en quittant le groupe : ' + error.message);
                return;
            }
            if (profile?.group_id === id) {
                await supabase.from('profiles').update({ group_id: null }).eq('id', user.id);
            }
            await fetchProfile(user.id);
            await fetchAll();
        } catch (err) {
            console.error('Erreur leave:', err);
        }
    };

    const openEdit = () => {
        setEditName(group.name);
        setEditDesc(group.description || '');
        setEditColor(group.color);
        setEditError('');
        setShowEdit(true);
    };

    const handleSaveEdit = async () => {
        if (!editName.trim()) return;
        setSaving(true);
        setEditError('');
        try {
            const { error } = await supabase
                .from('groups')
                .update({ name: editName.trim(), description: editDesc.trim(), color: editColor })
                .eq('id', id);
            if (error) throw error;
            await fetchGroups();
            await fetchProfile(user.id);
            await fetchAll();
            setShowEdit(false);
        } catch (err) {
            setEditError(err.message?.includes('duplicate') ? 'Ce nom de groupe existe déjà.' : err.message);
        } finally {
            setSaving(false);
        }
    };

    const getEndTime = (startTime, duration) => {
        const [h, m] = startTime.split(':').map(Number);
        const total = h * 60 + m + duration;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const formatDuration = (seconds) => {
        const min = Math.floor((seconds || 0) / 60);
        const sec = (seconds || 0) % 60;
        return `${min}:${String(sec).padStart(2, '0')}`;
    };

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];

    return (
        <AppShell>
            {loading ? (
                <div className="flex-center" style={{ padding: '120px 0' }}>
                    <div className="spinner"></div>
                </div>
            ) : notFound || !group ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🎸</div>
                    <h3>Groupe introuvable</h3>
                    <p className="text-muted">Ce groupe n'existe plus.</p>
                    <button className="btn btn-primary mt-md" onClick={() => router.push('/groups')}>
                        ← Retour aux groupes
                    </button>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <div className="group-hero">
                        <div
                            className="group-hero-banner"
                            style={{
                                background: `linear-gradient(120deg, ${group.color}55 0%, ${group.color}22 45%, var(--bg-card) 100%)`,
                            }}
                        ></div>
                        <div className="group-hero-content">
                            <div
                                className="group-hero-icon"
                                style={{ backgroundColor: group.color + '30', color: group.color, borderColor: group.color + '60' }}
                            >
                                🎵
                            </div>
                            <div className="group-hero-text">
                                <div className="group-hero-title-row">
                                    <h1>{group.name}</h1>
                                    {group.description && (
                                        <span className="badge badge-group" style={{ backgroundColor: group.color }}>
                                            {group.description}
                                        </span>
                                    )}
                                </div>
                                <div className="group-hero-meta">
                                    <span>{members.length} membre{members.length > 1 ? 's' : ''}</span>
                                    <span>·</span>
                                    <span>{repertoire.length} morceau{repertoire.length > 1 ? 'x' : ''} au répertoire</span>
                                    <span>·</span>
                                    <span>{reservations.length} répétition{reservations.length > 1 ? 's' : ''} à venir</span>
                                </div>
                                <div className="avatar-stack">
                                    {members.slice(0, 8).map(m => (
                                        <Avatar key={m.id} name={m.username} size={32} />
                                    ))}
                                    {members.length > 8 && (
                                        <span className="avatar-stack-more">+{members.length - 8}</span>
                                    )}
                                </div>
                            </div>
                            <div className="group-hero-actions">
                                {canEdit && (
                                    <button className="btn btn-secondary" onClick={openEdit}>
                                        ✏️ Modifier le groupe
                                    </button>
                                )}
                                {isMyGroup ? (
                                    <button className="btn btn-danger" onClick={handleLeave}>
                                        Quitter le groupe
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        style={{ backgroundColor: group.color, borderColor: group.color }}
                                        onClick={handleJoin}
                                    >
                                        Rejoindre ce groupe
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contenu en deux colonnes */}
                    <div className="page-grid">
                        <div className="page-grid-main">
                            {/* Prochaines réservations */}
                            <div className="panel">
                                <div className="panel-header">
                                    <h2>📅 Prochaines réservations</h2>
                                </div>
                                {reservations.length > 0 ? (
                                    <div className="res-list">
                                        {reservations.map(r => {
                                            const d = new Date(r.date + 'T00:00:00');
                                            return (
                                                <div key={r.id} className="res-row">
                                                    <span className="res-date-block" style={{ borderColor: group.color + '50' }}>
                                                        <span className="res-date-day">{d.getDate()}</span>
                                                        <span className="res-date-month">{monthNames[d.getMonth()]}</span>
                                                    </span>
                                                    <span className="res-row-info">
                                                        <span className="res-row-title">{r.title || 'Répétition'}</span>
                                                        <span className="res-row-sub">
                                                            {dayNames[d.getDay()]} · {r.start_time.slice(0, 5)} → {getEndTime(r.start_time, r.duration)}
                                                        </span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-muted panel-empty">Aucune réservation prévue — direction le calendrier !</p>
                                )}
                            </div>

                            {/* Répertoire */}
                            <div className="panel">
                                <div className="panel-header">
                                    <h2>🎸 Répertoire <span className="panel-count">{repertoire.length}</span></h2>
                                    {isMyGroup && (
                                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddSong(true)}>
                                            ＋ Ajouter
                                        </button>
                                    )}
                                </div>
                                {repertoire.length > 0 ? (
                                    <table className="repertoire-table">
                                        <thead>
                                            <tr>
                                                <th>Titre</th>
                                                <th>Artiste</th>
                                                <th>Durée</th>
                                                <th>Liens</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {repertoire.map(song => (
                                                <tr key={song.id} onClick={() => setSelectedSong(song)}>
                                                    <td className="repertoire-title">{song.title}</td>
                                                    <td className="text-secondary">{song.artist}</td>
                                                    <td className="text-muted">{formatDuration(song.duration_seconds)}</td>
                                                    <td className="repertoire-links" onClick={(e) => e.stopPropagation()}>
                                                        <a
                                                            href={song.youtube_url || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`}
                                                            target="_blank" rel="noopener noreferrer" title="YouTube"
                                                        >▶️</a>
                                                        <a
                                                            href={`https://www.songsterr.com/a/wa/bestMatchForQueryString?s=${encodeURIComponent(song.title)}&a=${encodeURIComponent(song.artist)}`}
                                                            target="_blank" rel="noopener noreferrer" title="Tablatures Songsterr"
                                                        >🎸</a>
                                                        {song.lyrics && <span title="Paroles disponibles">📝</span>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="text-muted panel-empty">
                                        Aucun morceau pour le moment{isMyGroup ? ' — ajoute le premier !' : '.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="page-grid-side">
                            {/* Membres */}
                            <div className="panel">
                                <div className="panel-header">
                                    <h2>👥 Membres <span className="panel-count">{members.length}</span></h2>
                                </div>
                                {members.length > 0 ? (
                                    <div className="member-list">
                                        {members.map(m => (
                                            <div key={m.id} className="member-row">
                                                <Avatar name={m.username} size={34} />
                                                <span className="member-name">{m.username}</span>
                                                {m.role === 'admin' && <span className="member-badge">admin</span>}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted panel-empty">Personne pour le moment.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modal édition */}
                    {showEdit && (
                        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
                            <div className="modal" onClick={e => e.stopPropagation()}>
                                <div className="modal-header">
                                    <h2>✏️ Modifier le groupe</h2>
                                    <button className="btn btn-ghost btn-icon" onClick={() => setShowEdit(false)}>✕</button>
                                </div>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label className="form-label">Nom du groupe *</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Style musical</label>
                                        <input
                                            type="text"
                                            className="form-input"
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Couleur</label>
                                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                            {GROUP_COLORS.map((c) => (
                                                <button
                                                    key={c.color}
                                                    type="button"
                                                    onClick={() => setEditColor(c.color)}
                                                    style={{
                                                        width: '36px',
                                                        height: '36px',
                                                        borderRadius: '10px',
                                                        backgroundColor: c.color,
                                                        border: editColor === c.color ? '3px solid white' : '3px solid transparent',
                                                        cursor: 'pointer',
                                                    }}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {editError && <div className="form-error">⚠️ {editError}</div>}
                                </div>
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Annuler</button>
                                    <button
                                        className="btn btn-primary"
                                        onClick={handleSaveEdit}
                                        disabled={saving || !editName.trim()}
                                    >
                                        {saving ? <span className="spinner"></span> : '✓ Enregistrer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Modals répertoire (réutilisés) */}
                    {showAddSong && (
                        <AddRepertoireSongModal
                            groupId={group.id}
                            onClose={() => setShowAddSong(false)}
                            onSaved={() => { setShowAddSong(false); fetchAll(); }}
                        />
                    )}
                    {selectedSong && (
                        <SongDetailsModal
                            song={selectedSong}
                            onClose={() => setSelectedSong(null)}
                            onUpdated={() => fetchAll()}
                        />
                    )}
                </>
            )}
        </AppShell>
    );
}

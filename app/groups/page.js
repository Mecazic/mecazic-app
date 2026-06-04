'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from '@/app/components/Sidebar';
import LoginPage from '@/app/login/LoginPage';
import GroupDetailsModal from '@/app/components/GroupDetailsModal';

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

export default function GroupsPage() {
    const { user, profile, groups, loading: authLoading, fetchGroups, fetchProfile } = useAuth();
    const [groupMembers, setGroupMembers] = useState({});
    const [groupReservations, setGroupReservations] = useState({});
    const [groupRepertoire, setGroupRepertoire] = useState({});
    const [loading, setLoading] = useState(true);
    const isAdmin = profile?.role === 'admin';

    // Create group state
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [newGroupDesc, setNewGroupDesc] = useState('');
    const [newGroupColor, setNewGroupColor] = useState('#8B5CF6');
    const [creatingGroup, setCreatingGroup] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    // Group details modal state
    const [selectedGroup, setSelectedGroup] = useState(null);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);

        try {
            const { data: groupMembersData, error: gmError } = await supabase
                .from('group_members')
                .select('group_id, role, profiles(id, username)');

            if (gmError) console.error("Error fetching group members:", gmError);

            const members = {};
            (groupMembersData || []).forEach(gm => {
                if (!members[gm.group_id]) members[gm.group_id] = [];
                if (gm.profiles) members[gm.group_id].push(gm.profiles);
            });
            setGroupMembers(members);

            const today = new Date().toISOString().split('T')[0];
            const { data: reservations, error: resError } = await supabase
                .from('reservations')
                .select('*, groups(name, color)')
                .gte('date', today)
                .order('date')
                .order('start_time')
                .limit(50);

            if (resError) console.error("Error fetching reservations:", resError);

            const resMap = {};
            (reservations || []).forEach(r => {
                if (!resMap[r.group_id]) resMap[r.group_id] = [];
                resMap[r.group_id].push(r);
            });
            setGroupReservations(resMap);

            const { data: repertoire, error: repError } = await supabase
                .from('group_repertoire')
                .select('*')
                .order('title');

            if (repError) console.error("Error fetching repertoire:", repError);

            const repMap = {};
            (repertoire || []).forEach(r => {
                if (!repMap[r.group_id]) repMap[r.group_id] = [];
                repMap[r.group_id].push(r);
            });
            setGroupRepertoire(repMap);
        } catch (err) {
            console.error("Error in fetchData:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateGroup = async () => {
        if (!newGroupName.trim()) return;
        setCreatingGroup(true);
        setCreateError('');
        setCreateSuccess('');

        try {
            const { data, error } = await supabase
                .from('groups')
                .insert({
                    name: newGroupName.trim(),
                    description: newGroupDesc.trim(),
                    color: newGroupColor,
                })
                .select()
                .single();

            if (error) throw error;

            // Auto-join the newly created group
            if (user) {
                await supabase
                    .from('group_members')
                    .insert({ user_id: user.id, group_id: data.id, role: 'admin' });

                await supabase
                    .from('profiles')
                    .update({ group_id: data.id })
                    .eq('id', user.id);
                await fetchProfile(user.id);
            }

            await fetchGroups();
            await fetchData();
            setShowCreateGroup(false);
            setNewGroupName('');
            setNewGroupDesc('');
            setCreateSuccess(`Groupe "${data.name}" créé et rejoint ! 🎉`);
            setTimeout(() => setCreateSuccess(''), 4000);
        } catch (err) {
            if (err.message?.includes('duplicate')) {
                setCreateError('Ce nom de groupe existe déjà.');
            } else {
                setCreateError(err.message);
            }
        } finally {
            setCreatingGroup(false);
        }
    };

    const handleJoinGroup = async (groupId) => {
        try {
            const { error: joinError } = await supabase
                .from('group_members')
                .insert({ user_id: user.id, group_id: groupId, role: 'member' });

            if (joinError) {
                if (joinError.code === '23505') {
                    // Already a member, ignore
                    return;
                }
                console.error('Erreur lors de la jonction:', joinError);
                alert('Erreur lors de la jonction au groupe : ' + joinError.message);
                return;
            }

            // Legacy field update — non-blocking
            await supabase
                .from('profiles')
                .update({ group_id: groupId })
                .eq('id', user.id);

            await fetchProfile(user.id);
            await fetchGroups();
            await fetchData();
        } catch (err) {
            console.error('Exception handleJoinGroup:', err);
            alert('Erreur inattendue lors de la jonction au groupe.');
        }
    };

    const handleLeaveGroup = async (groupId) => {
        try {
            const { error: leaveError } = await supabase
                .from('group_members')
                .delete()
                .eq('user_id', user.id)
                .eq('group_id', groupId);

            if (leaveError) {
                console.error('Erreur leave group:', leaveError);
                alert('Erreur en quittant le groupe : ' + leaveError.message);
                return;
            }

            if (profile?.group_id === groupId) {
                await supabase
                    .from('profiles')
                    .update({ group_id: null })
                    .eq('id', user.id);
            }
            await fetchProfile(user.id);
            await fetchGroups();
            await fetchData();
        } catch (err) {
            console.error('Exception handleLeaveGroup:', err);
            alert('Erreur inattendue en quittant le groupe.');
        }
    };

    const handleDeleteGroup = async (groupId) => {
        if (!confirm("⚠️ ATTENTION : Cela supprimera définitivement le groupe, ses membres, son répertoire et toutes ses réservations. Continuer ?")) return;

        try {
            const { error } = await supabase.from('groups').delete().eq('id', groupId);
            if (error) {
                console.error('Erreur suppression groupe:', error);
                alert('Erreur lors de la suppression du groupe : ' + error.message);
                return;
            }

            if (selectedGroup?.id === groupId) setSelectedGroup(null);
            await fetchProfile(user.id);
            await fetchGroups();
            await fetchData();
        } catch (err) {
            console.error('Exception handleDeleteGroup:', err);
            alert('Erreur inattendue lors de la suppression du groupe.');
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

    const getEndTime = (startTime, duration) => {
        const [h, m] = startTime.split(':').map(Number);
        const total = h * 60 + m + duration;
        return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
    };

    const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const monthNames = ['jan', 'fév', 'mar', 'avr', 'mai', 'juin', 'juil', 'août', 'sep', 'oct', 'nov', 'déc'];

    const formatDate = (dateStr) => {
        const d = new Date(dateStr + 'T00:00:00');
        return `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
    };

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-header">
                    <h1>
                        <span className="page-header-icon">🎸</span>
                        Groupes de musique
                    </h1>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowCreateGroup(!showCreateGroup)}
                    >
                        {showCreateGroup ? '✕ Annuler' : '＋ Créer un groupe'}
                    </button>
                </div>

                {/* No group warning */}
                {(!profile?.groups || profile.groups.length === 0) && (
                    <div className="card" style={{
                        marginBottom: 'var(--space-lg)',
                        borderLeft: '3px solid var(--accent-warning)',
                        background: 'rgba(245, 158, 11, 0.08)',
                    }}>
                        <div className="flex gap-md" style={{ alignItems: 'center' }}>
                            <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                            <div>
                                <div style={{ fontWeight: 600 }}>Tu n'as pas encore de groupe</div>
                                <div className="text-muted" style={{ fontSize: '0.85rem' }}>
                                    Rejoins un groupe existant ou crée le tien pour pouvoir réserver la salle.
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Success message */}
                {createSuccess && (
                    <div className="card" style={{
                        marginBottom: 'var(--space-lg)',
                        borderLeft: '3px solid var(--accent-success)',
                        background: 'rgba(16, 185, 129, 0.08)',
                        fontSize: '0.9rem',
                    }}>
                        {createSuccess}
                    </div>
                )}

                {/* Create group form */}
                {showCreateGroup && (
                    <div className="card" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-xl)' }}>
                        <h3 style={{ marginBottom: 'var(--space-lg)' }}>🎵 Créer un nouveau groupe</h3>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
                            <div className="form-group">
                                <label className="form-label">Nom du groupe *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Les Amplifiés"
                                    value={newGroupName}
                                    onChange={(e) => setNewGroupName(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Style musical</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Rock & Metal"
                                    value={newGroupDesc}
                                    onChange={(e) => setNewGroupDesc(e.target.value)}
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">Couleur du groupe</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                    {GROUP_COLORS.map((c) => (
                                        <button
                                            key={c.color}
                                            type="button"
                                            onClick={() => setNewGroupColor(c.color)}
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '10px',
                                                backgroundColor: c.color,
                                                border: newGroupColor === c.color ? '3px solid white' : '3px solid transparent',
                                                cursor: 'pointer',
                                                transition: 'transform 0.15s',
                                                transform: newGroupColor === c.color ? 'scale(1.15)' : 'scale(1)',
                                            }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>

                            {createError && (
                                <div className="form-error">⚠️ {createError}</div>
                            )}

                            <button
                                className="btn btn-primary"
                                onClick={handleCreateGroup}
                                disabled={creatingGroup || !newGroupName.trim()}
                                style={{ alignSelf: 'flex-start' }}
                            >
                                {creatingGroup ? (
                                    <span className="spinner"></span>
                                ) : (
                                    '✓ Créer et rejoindre le groupe'
                                )}
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex-center" style={{ padding: '80px 0' }}>
                        <div className="spinner"></div>
                    </div>
                ) : groups.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🎸</div>
                        <h3>Aucun groupe pour le moment</h3>
                        <p>Crée le premier groupe de musique !</p>
                    </div>
                ) : (
                    <div className="groups-grid">
                        {groups.map((group) => {
                            const members = groupMembers[group.id] || [];
                            const upcomingRes = (groupReservations[group.id] || []).slice(0, 3);
                            const isMyGroup = profile?.groups?.some(g => g.id === group.id);

                            return (
                                <div
                                    key={group.id}
                                    className="group-card"
                                    style={{ '--group-color': group.color, cursor: 'pointer' }}
                                    onClick={() => setSelectedGroup(group)}
                                >
                                    <div className="group-card-header">
                                        <div
                                            className="group-card-color"
                                            style={{ backgroundColor: group.color + '20', color: group.color }}
                                        >
                                            🎵
                                        </div>
                                        <div>
                                            <div className="group-card-name">
                                                {group.name}
                                                {isMyGroup && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        fontSize: '0.7rem',
                                                        background: group.color,
                                                        color: 'white',
                                                        padding: '2px 8px',
                                                        borderRadius: '9999px',
                                                        fontWeight: 600,
                                                    }}>
                                                        Mon groupe
                                                    </span>
                                                )}
                                            </div>
                                            <div className="group-card-desc">{group.description}</div>
                                        </div>
                                    </div>

                                    <div className="group-card-stats">
                                        <div className="group-card-stat">
                                            <span className="group-card-stat-value">{members.length}</span>
                                            <span className="group-card-stat-label">Membres</span>
                                        </div>
                                        <div className="group-card-stat">
                                            <span className="group-card-stat-value">
                                                {(groupReservations[group.id] || []).length}
                                            </span>
                                            <span className="group-card-stat-label">Réservations à venir</span>
                                        </div>
                                    </div>

                                    <div
                                        style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-color)' }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <div className="flex gap-sm">
                                            {isMyGroup ? (
                                                <button
                                                    className="btn btn-danger btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); handleLeaveGroup(group.id); }}
                                                    style={{ flex: 1 }}
                                                >
                                                    Quitter le groupe
                                                </button>
                                            ) : (
                                                <button
                                                    className="btn btn-secondary btn-sm"
                                                    onClick={(e) => { e.stopPropagation(); handleJoinGroup(group.id); }}
                                                    style={{ flex: 1 }}
                                                >
                                                    Rejoindre
                                                </button>
                                            )}

                                            {isAdmin && (
                                                <button
                                                    className="btn btn-ghost btn-sm btn-icon text-danger"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                                    title="Supprimer définitivement le groupe"
                                                    style={{ width: '40px', padding: 0 }}
                                                >
                                                    🗑️
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Group Details Modal */}
                {selectedGroup && (
                    <GroupDetailsModal
                        group={selectedGroup}
                        members={groupMembers[selectedGroup.id] || []}
                        reservations={groupReservations[selectedGroup.id] || []}
                        repertoire={groupRepertoire[selectedGroup.id] || []}
                        isMyGroup={profile?.groups?.some(g => g.id === selectedGroup.id)}
                        onJoin={handleJoinGroup}
                        onLeave={() => handleLeaveGroup(selectedGroup.id)}
                        onClose={() => setSelectedGroup(null)}
                        onRepertoireChange={fetchData}
                    />
                )}
            </main>
        </div>
    );
}

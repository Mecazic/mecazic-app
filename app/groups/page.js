'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import AppShell from '@/app/components/AppShell';
import LoginPage from '@/app/login/LoginPage';
import { cn } from '@/lib/utils';
import { Users, Plus, X, AlertTriangle, CheckCircle2, Music, Trash2, Loader2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

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
    const router = useRouter();
    const { user, profile, groups, loading: authLoading, fetchGroups, fetchProfile } = useAuth();
    const [groupMembers, setGroupMembers] = useState({});
    const [groupReservations, setGroupReservations] = useState({});
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
            setCreateSuccess(`Groupe "${data.name}" créé et rejoint.`);
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
        if (!confirm("ATTENTION : Cela supprimera définitivement le groupe, ses membres, son répertoire et toutes ses réservations. Continuer ?")) return;

        try {
            const { error } = await supabase.from('groups').delete().eq('id', groupId);
            if (error) {
                console.error('Erreur suppression groupe:', error);
                alert('Erreur lors de la suppression du groupe : ' + error.message);
                return;
            }

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
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-console">
                <Loader2 className="h-8 w-8 animate-spin text-signal" />
                <p className="font-mono text-sm text-muted-foreground">Chargement…</p>
            </div>
        );
    }

    if (!user) return <LoginPage />;

    const labelClass = 'font-mono text-[11px] uppercase tracking-wider text-muted-foreground';

    return (
        <AppShell>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
                <h1 className="flex items-center gap-2.5 font-display text-2xl font-extrabold uppercase tracking-tight text-cream">
                    <Users className="h-6 w-6 text-signal" />
                    Groupes de musique
                </h1>
                <Button
                    variant={showCreateGroup ? 'outline' : 'default'}
                    onClick={() => setShowCreateGroup(!showCreateGroup)}
                >
                    {showCreateGroup ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {showCreateGroup ? 'Annuler' : 'Créer un groupe'}
                </Button>
            </div>

            {/* Avertissement sans groupe */}
            {(!profile?.groups || profile.groups.length === 0) && (
                <div className="mb-5 flex items-center gap-3 rounded-lg border border-signal/30 bg-signal/[0.08] px-4 py-3">
                    <AlertTriangle className="h-5 w-5 shrink-0 text-signal" />
                    <div>
                        <div className="font-semibold text-cream">Tu n'as pas encore de groupe</div>
                        <div className="text-sm text-muted-foreground">
                            Rejoins un groupe existant ou crée le tien pour pouvoir réserver la salle.
                        </div>
                    </div>
                </div>
            )}

            {/* Message de succès */}
            {createSuccess && (
                <div className="mb-5 flex items-center gap-2 rounded-lg border border-chart-3/30 bg-chart-3/10 px-4 py-3 text-sm text-chart-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {createSuccess}
                </div>
            )}

            {/* Formulaire de création */}
            {showCreateGroup && (
                <div className="glass mb-8 rounded-xl p-6">
                    <h3 className="mb-5 font-display text-lg font-bold uppercase tracking-tight text-cream">
                        Créer un nouveau groupe
                    </h3>

                    <div className="flex flex-col gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>Nom du groupe *</label>
                            <Input
                                type="text"
                                placeholder="Ex : Les Amplifiés"
                                value={newGroupName}
                                onChange={(e) => setNewGroupName(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>Style musical</label>
                            <Input
                                type="text"
                                placeholder="Ex : Rock & Metal"
                                value={newGroupDesc}
                                onChange={(e) => setNewGroupDesc(e.target.value)}
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>Couleur du groupe</label>
                            <div className="flex flex-wrap gap-2">
                                {GROUP_COLORS.map((c) => (
                                    <button
                                        key={c.color}
                                        type="button"
                                        onClick={() => setNewGroupColor(c.color)}
                                        className={cn(
                                            'h-10 w-10 rounded-lg ring-2 ring-offset-2 ring-offset-card transition-transform',
                                            newGroupColor === c.color
                                                ? 'scale-110 ring-cream'
                                                : 'ring-transparent hover:scale-105'
                                        )}
                                        style={{ backgroundColor: c.color }}
                                        title={c.label}
                                    />
                                ))}
                            </div>
                        </div>

                        {createError && (
                            <div className="flex items-center gap-2 rounded-md border border-vu/30 bg-vu/10 px-3 py-2 text-sm text-vu">
                                <AlertTriangle className="h-4 w-4 shrink-0" />
                                {createError}
                            </div>
                        )}

                        <Button
                            className="self-start"
                            onClick={handleCreateGroup}
                            disabled={creatingGroup || !newGroupName.trim()}
                        >
                            {creatingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer et rejoindre le groupe'}
                        </Button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-6 w-6 animate-spin text-signal" />
                </div>
            ) : groups.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/40" />
                    <h3 className="font-semibold text-cream">Aucun groupe pour le moment</h3>
                    <p className="text-sm text-muted-foreground">Crée le premier groupe de musique.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {groups.map((group) => {
                        const members = groupMembers[group.id] || [];
                        const upcomingCount = (groupReservations[group.id] || []).length;
                        const isMyGroup = profile?.groups?.some(g => g.id === group.id);

                        return (
                            <div
                                key={group.id}
                                onClick={() => router.push(`/groups/${group.id}`)}
                                className="group glass relative cursor-pointer overflow-hidden rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-xl"
                            >
                                {/* Filet de couleur en haut */}
                                <span
                                    className="absolute inset-x-0 top-0 h-[3px]"
                                    style={{ backgroundColor: group.color }}
                                />

                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-md"
                                        style={{ backgroundColor: group.color + '20', color: group.color }}
                                    >
                                        {group.avatar_url ? (
                                            <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                                        ) : (
                                            <Music className="h-5 w-5" />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-display text-base font-bold text-cream">{group.name}</span>
                                            {isMyGroup && (
                                                <span
                                                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                                                    style={{ backgroundColor: group.color }}
                                                >
                                                    Mon groupe
                                                </span>
                                            )}
                                        </div>
                                        {group.description && (
                                            <div className="truncate text-sm text-muted-foreground">{group.description}</div>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-6 border-t border-border pt-4">
                                    <div className="flex flex-col">
                                        <span className="font-display text-lg font-bold text-cream">{members.length}</span>
                                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Membres</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-display text-lg font-bold text-cream">{upcomingCount}</span>
                                        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Résa à venir</span>
                                    </div>
                                </div>

                                <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                                    {isMyGroup ? (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1 border-vu/40 text-vu hover:bg-vu/10 hover:text-vu"
                                            onClick={(e) => { e.stopPropagation(); handleLeaveGroup(group.id); }}
                                        >
                                            Quitter le groupe
                                        </Button>
                                    ) : (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="flex-1"
                                            onClick={(e) => { e.stopPropagation(); handleJoinGroup(group.id); }}
                                        >
                                            Rejoindre
                                        </Button>
                                    )}

                                    {isAdmin && (
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            className="text-muted-foreground hover:bg-vu/10 hover:text-vu"
                                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                                            title="Supprimer définitivement le groupe"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </AppShell>
    );
}

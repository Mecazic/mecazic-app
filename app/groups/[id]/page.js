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
import { cn } from '@/lib/utils';
import {
    Music, Users, CalendarDays, Pencil, Plus, ArrowLeft, Loader2,
    Play, Guitar, FileText, AlertTriangle, Trash2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { ImageUpload } from '@/app/components/ui/image-upload';
import { usePlayer } from '@/app/contexts/PlayerContext';
import { youtubeId } from '@/lib/youtube';

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
    const { play } = usePlayer();

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
    const [editAvatar, setEditAvatar] = useState('');
    const [editBanner, setEditBanner] = useState('');
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
            <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-console">
                <Loader2 className="h-8 w-8 animate-spin text-signal" />
                <p className="text-sm text-muted-foreground">Chargement…</p>
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
        setEditAvatar(group.avatar_url || '');
        setEditBanner(group.banner_url || '');
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
                .update({ name: editName.trim(), description: editDesc.trim(), color: editColor, avatar_url: editAvatar || null, banner_url: editBanner || null })
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

    const handleDeleteSong = async (song) => {
        if (!confirm(`Supprimer « ${song.title} » du répertoire ?`)) return;
        try {
            const { error } = await supabase.from('group_repertoire').delete().eq('id', song.id);
            if (error) {
                alert('Erreur lors de la suppression : ' + error.message);
                return;
            }
            fetchAll();
        } catch (err) {
            console.error('Exception handleDeleteSong:', err);
            alert('Erreur inattendue lors de la suppression.');
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

    const labelClass = 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground';

    return (
        <AppShell>
            {loading ? (
                <div className="flex items-center justify-center py-28">
                    <Loader2 className="h-6 w-6 animate-spin text-signal" />
                </div>
            ) : notFound || !group ? (
                <div className="flex flex-col items-center gap-2 py-16 text-center">
                    <Users className="h-12 w-12 text-muted-foreground/40" />
                    <h3 className="font-semibold text-cream">Groupe introuvable</h3>
                    <p className="text-sm text-muted-foreground">Ce groupe n'existe plus.</p>
                    <Button className="mt-3" onClick={() => router.push('/groups')}>
                        <ArrowLeft className="h-4 w-4" />
                        Retour aux groupes
                    </Button>
                </div>
            ) : (
                <>
                    {/* Hero */}
                    <div className="glass mb-6 overflow-hidden rounded-xl">
                        <div className="relative h-28 overflow-hidden">
                            {group.banner_url ? (
                                <>
                                    <img src={group.banner_url} alt="" className="h-full w-full object-cover" />
                                    <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${group.color}40, transparent 65%)` }} />
                                </>
                            ) : (
                                <div className="h-full w-full" style={{ background: `linear-gradient(120deg, ${group.color}55 0%, ${group.color}22 45%, var(--card) 100%)` }} />
                            )}
                        </div>
                        <div className="-mt-11 flex flex-wrap items-end gap-4 px-6 pb-6">
                            <div
                                className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border shadow-md backdrop-blur"
                                style={{ backgroundColor: group.color + '30', color: group.color, borderColor: group.color + '60' }}
                            >
                                {group.avatar_url ? (
                                    <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <Music className="h-9 w-9" />
                                )}
                            </div>
                            <div className="min-w-[240px] flex-1">
                                <div className="flex flex-wrap items-center gap-3">
                                    <h1 className="font-caps text-3xl font-extrabold uppercase tracking-normal text-cream">{group.name}</h1>
                                    {group.description && (
                                        <span
                                            className="rounded-full px-3 py-0.5 text-xs font-semibold text-white"
                                            style={{ backgroundColor: group.color }}
                                        >
                                            {group.description}
                                        </span>
                                    )}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>{members.length} membre{members.length > 1 ? 's' : ''}</span>
                                    <span>·</span>
                                    <span>{repertoire.length} morceau{repertoire.length > 1 ? 'x' : ''}</span>
                                    <span>·</span>
                                    <span>{reservations.length} répét{reservations.length > 1 ? 's' : ''} à venir</span>
                                </div>
                                {members.length > 0 && (
                                    <div className="mt-3 flex items-center -space-x-2">
                                        {members.slice(0, 8).map(m => (
                                            <Avatar key={m.id} name={m.username} size={32} />
                                        ))}
                                        {members.length > 8 && (
                                            <span className="ml-3 font-mono text-xs font-semibold text-muted-foreground">+{members.length - 8}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="ml-auto flex flex-wrap items-center gap-2">
                                {canEdit && (
                                    <Button variant="outline" onClick={openEdit}>
                                        <Pencil className="h-4 w-4" />
                                        Modifier
                                    </Button>
                                )}
                                {isMyGroup ? (
                                    <Button
                                        variant="outline"
                                        className="border-vu/40 text-vu hover:bg-vu/10 hover:text-vu"
                                        onClick={handleLeave}
                                    >
                                        Quitter le groupe
                                    </Button>
                                ) : (
                                    <Button
                                        className="text-white hover:opacity-90"
                                        style={{ backgroundColor: group.color }}
                                        onClick={handleJoin}
                                    >
                                        Rejoindre ce groupe
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Contenu deux colonnes */}
                    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-3">
                        <div className="flex flex-col gap-5 lg:col-span-2">
                            {/* Prochaines réservations */}
                            <div className="glass rounded-xl p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-normal text-cream">
                                        <CalendarDays className="h-4 w-4 text-signal" />
                                        Prochaines réservations
                                    </h2>
                                </div>
                                {reservations.length > 0 ? (
                                    <div className="flex flex-col gap-2">
                                        {reservations.map(r => {
                                            const d = new Date(r.date + 'T00:00:00');
                                            return (
                                                <div key={r.id} className="flex items-center gap-3 rounded-md border border-border bg-panel px-3 py-2.5">
                                                    <span
                                                        className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-md border bg-card"
                                                        style={{ borderColor: group.color + '50' }}
                                                    >
                                                        <span className="font-mono text-lg font-bold leading-none text-cream">{d.getDate()}</span>
                                                        <span className="text-[9px] font-semibold tracking-wider text-muted-foreground">{monthNames[d.getMonth()]}</span>
                                                    </span>
                                                    <span className="flex min-w-0 flex-col">
                                                        <span className="font-semibold text-cream">{r.title || 'Répétition'}</span>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {dayNames[d.getDay()]} · {r.start_time.slice(0, 5)} → {getEndTime(r.start_time, r.duration)}
                                                        </span>
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <p className="py-2 text-sm italic text-muted-foreground">Aucune réservation prévue — direction le calendrier.</p>
                                )}
                            </div>

                            {/* Répertoire */}
                            <div className="glass rounded-xl p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-normal text-cream">
                                        <Guitar className="h-4 w-4 text-signal" />
                                        Répertoire
                                        <span className="rounded-full border border-border bg-panel px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                                            {repertoire.length}
                                        </span>
                                    </h2>
                                    {isMyGroup && (
                                        <Button size="sm" onClick={() => setShowAddSong(true)}>
                                            <Plus className="h-3.5 w-3.5" />
                                            Ajouter
                                        </Button>
                                    )}
                                </div>
                                {repertoire.length > 0 ? (
                                    <table className="w-full border-collapse">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Titre</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Artiste</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Durée</th>
                                                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Liens</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {repertoire.map(song => (
                                                <tr
                                                    key={song.id}
                                                    onClick={() => setSelectedSong(song)}
                                                    className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-panel/60"
                                                >
                                                    <td className="px-3 py-2.5 text-sm font-semibold text-cream">{song.title}</td>
                                                    <td className="px-3 py-2.5 text-sm text-muted-foreground">{song.artist}</td>
                                                    <td className="px-3 py-2.5 font-mono text-sm text-muted-foreground">{formatDuration(song.duration_seconds)}</td>
                                                    <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-2.5">
                                                            {youtubeId(song.youtube_url) ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); play({ videoId: youtubeId(song.youtube_url), title: song.title, artist: song.artist }); }}
                                                                    title="Jouer dans l'app"
                                                                    className="text-muted-foreground transition-colors hover:text-signal"
                                                                ><Play className="h-4 w-4" /></button>
                                                            ) : (
                                                                <a
                                                                    href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${song.artist} ${song.title}`)}`}
                                                                    target="_blank" rel="noopener noreferrer" title="Chercher sur YouTube"
                                                                    className="text-muted-foreground transition-colors hover:text-vu"
                                                                ><Play className="h-4 w-4" /></a>
                                                            )}
                                                            <a
                                                                href={`https://www.songsterr.com/a/wa/bestMatchForQueryString?s=${encodeURIComponent(song.title)}&a=${encodeURIComponent(song.artist)}`}
                                                                target="_blank" rel="noopener noreferrer" title="Tablatures Songsterr"
                                                                className="text-muted-foreground transition-colors hover:text-signal"
                                                            ><Guitar className="h-4 w-4" /></a>
                                                            {song.lyrics && <FileText className="h-4 w-4 text-muted-foreground/60" title="Paroles disponibles" />}
                                                            {canEdit && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); handleDeleteSong(song); }}
                                                                    title="Supprimer du répertoire"
                                                                    className="text-muted-foreground transition-colors hover:text-vu"
                                                                ><Trash2 className="h-4 w-4" /></button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p className="py-2 text-sm italic text-muted-foreground">
                                        Aucun morceau pour le moment{isMyGroup ? ' — ajoute le premier.' : '.'}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-5">
                            {/* Membres */}
                            <div className="glass rounded-xl p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 font-display text-base font-bold tracking-normal text-cream">
                                        <Users className="h-4 w-4 text-signal" />
                                        Membres
                                        <span className="rounded-full border border-border bg-panel px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
                                            {members.length}
                                        </span>
                                    </h2>
                                </div>
                                {members.length > 0 ? (
                                    <div className="flex flex-col gap-1">
                                        {members.map(m => (
                                            <div key={m.id} className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-panel/60">
                                                <Avatar name={m.username} size={34} />
                                                <span className="font-medium text-cream">{m.username}</span>
                                                {m.role === 'admin' && (
                                                    <span className="ml-auto rounded-full bg-signal/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-signal">
                                                        admin
                                                    </span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="py-2 text-sm italic text-muted-foreground">Personne pour le moment.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Modale édition */}
                    {showEdit && (
                        <Dialog open onOpenChange={(o) => !o && setShowEdit(false)}>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle className="font-display tracking-normal text-cream">
                                        Modifier le groupe
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="flex flex-col gap-4">
                                    <ImageUpload groupId={id} kind="banner" value={editBanner} onChange={setEditBanner} label="Bannière" />
                                    <ImageUpload groupId={id} kind="avatar" value={editAvatar} onChange={setEditAvatar} label="Photo du groupe" />
                                    <div className="flex flex-col gap-1.5">
                                        <label className={labelClass}>Nom du groupe *</label>
                                        <Input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className={labelClass}>Style musical</label>
                                        <Input
                                            type="text"
                                            value={editDesc}
                                            onChange={(e) => setEditDesc(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className={labelClass}>Couleur</label>
                                        <div className="flex flex-wrap gap-2">
                                            {GROUP_COLORS.map((c) => (
                                                <button
                                                    key={c.color}
                                                    type="button"
                                                    onClick={() => setEditColor(c.color)}
                                                    className={cn(
                                                        'h-9 w-9 rounded-lg ring-2 ring-offset-2 ring-offset-card transition-transform',
                                                        editColor === c.color ? 'scale-110 ring-cream' : 'ring-transparent hover:scale-105'
                                                    )}
                                                    style={{ backgroundColor: c.color }}
                                                    title={c.label}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    {editError && (
                                        <div className="flex items-center gap-2 rounded-md border border-vu/30 bg-vu/10 px-3 py-2 text-sm text-vu">
                                            <AlertTriangle className="h-4 w-4 shrink-0" />
                                            {editError}
                                        </div>
                                    )}
                                    <div className="mt-2 flex justify-end gap-2">
                                        <Button variant="outline" onClick={() => setShowEdit(false)}>Annuler</Button>
                                        <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
                                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}

                    {/* Modales répertoire (réutilisées) */}
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
                            canEdit={canEdit}
                            onClose={() => setSelectedSong(null)}
                            onUpdated={() => fetchAll()}
                        />
                    )}
                </>
            )}
        </AppShell>
    );
}

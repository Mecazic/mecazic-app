'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Search, Mic2, Music } from 'lucide-react';
import Avatar from './Avatar';

const days3 = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

export default function Topbar() {
    const { profile } = useAuth();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [now, setNow] = useState(null);
    const debounceRef = useRef(null);

    // Horloge timecode (touche console)
    useEffect(() => {
        setNow(new Date());
        const t = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        const q = query.trim();
        if (q.length < 2) {
            setResults(null);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            // Caractères réservés de la syntaxe de filtre PostgREST
            const safe = q.replace(/[,()]/g, ' ').trim();
            try {
                const [groupsRes, concertsRes, songsRes] = await Promise.all([
                    supabase.from('groups').select('id, name, color, description').ilike('name', `%${safe}%`).limit(5),
                    supabase.from('concerts').select('id, name, date, location').ilike('name', `%${safe}%`).limit(5),
                    supabase.from('group_repertoire').select('id, title, artist, group_id, groups(name, color)').or(`title.ilike.%${safe}%,artist.ilike.%${safe}%`).limit(5),
                ]);
                setResults({
                    groups: groupsRes.data || [],
                    concerts: concertsRes.data || [],
                    songs: songsRes.data || [],
                });
            } catch (err) {
                console.error('Erreur recherche:', err);
                setResults({ groups: [], concerts: [], songs: [] });
            } finally {
                setSearching(false);
            }
        }, 250);

        return () => clearTimeout(debounceRef.current);
    }, [query]);

    const go = (path) => {
        setOpen(false);
        setQuery('');
        setResults(null);
        router.push(path);
    };

    const hasResults = results && (results.groups.length || results.concerts.length || results.songs.length);

    const clock = now
        ? `${days3[now.getDay()]} ${String(now.getDate()).padStart(2, '0')}.${String(now.getMonth() + 1).padStart(2, '0')} · ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
        : '';

    return (
        <div className="pointer-events-none sticky top-0 z-30 -mx-4 mb-6 flex items-center gap-4 bg-gradient-to-b from-console via-console/70 to-transparent px-4 pb-6 pt-4 md:-mx-8 md:px-8">
            <div className="pointer-events-auto relative w-full max-w-xl">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Rechercher un groupe, un concert, un morceau…"
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
                    className="glass-float w-full rounded-full py-2.5 pl-10 pr-4 text-sm text-cream outline-none transition-all placeholder:text-muted-foreground focus:border-signal/60 focus:ring-2 focus:ring-signal/30"
                />

                {open && query.trim().length >= 2 && (
                    <div className="glass-float absolute left-0 right-0 top-[calc(100%+10px)] z-50 max-h-[420px] overflow-y-auto rounded-xl">
                        {searching && !results && (
                            <div className="p-4 text-center text-sm text-muted-foreground">Recherche…</div>
                        )}

                        {results && !hasResults && !searching && (
                            <div className="p-4 text-center text-sm text-muted-foreground">Aucun résultat pour « {query.trim()} »</div>
                        )}

                        {results?.groups.length > 0 && (
                            <div className="border-b border-border py-2 last:border-b-0">
                                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Groupes</div>
                                {results.groups.map((g) => (
                                    <button key={g.id} type="button" onMouseDown={() => go(`/groups/${g.id}`)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent">
                                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color }} />
                                        <span className="text-sm font-semibold text-cream">{g.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{g.description}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results?.concerts.length > 0 && (
                            <div className="border-b border-border py-2 last:border-b-0">
                                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Concerts</div>
                                {results.concerts.map((c) => (
                                    <button key={c.id} type="button" onMouseDown={() => go('/concerts')} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent">
                                        <Mic2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="text-sm font-semibold text-cream">{c.name}</span>
                                        <span className="truncate text-xs text-muted-foreground">{c.location}</span>
                                    </button>
                                ))}
                            </div>
                        )}

                        {results?.songs.length > 0 && (
                            <div className="border-b border-border py-2 last:border-b-0">
                                <div className="px-3 py-1 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground">Morceaux</div>
                                {results.songs.map((s) => (
                                    <button key={s.id} type="button" onMouseDown={() => go(`/groups/${s.group_id}`)} className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-accent">
                                        <Music className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="text-sm font-semibold text-cream">{s.title}</span>
                                        <span className="truncate text-xs text-muted-foreground">{s.artist}{s.groups?.name ? ` · ${s.groups.name}` : ''}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="ml-auto flex items-center gap-4">
                <span className="hidden font-mono text-xs tabular-nums tracking-wide text-muted-foreground sm:inline">{clock}</span>
                {profile && <Avatar name={profile.username} size={34} />}
            </div>
        </div>
    );
}

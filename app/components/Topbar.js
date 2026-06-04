'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import Avatar from './Avatar';

export default function Topbar() {
    const { profile } = useAuth();
    const router = useRouter();
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [open, setOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const debounceRef = useRef(null);

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

    return (
        <div className="topbar">
            <div className="topbar-search">
                <span className="topbar-search-icon">⌕</span>
                <input
                    type="text"
                    placeholder="Rechercher un groupe, un concert, un morceau..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={() => setTimeout(() => setOpen(false), 150)}
                    onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
                />

                {open && query.trim().length >= 2 && (
                    <div className="search-dropdown">
                        {searching && !results && (
                            <div className="search-empty">Recherche...</div>
                        )}

                        {results && !hasResults && !searching && (
                            <div className="search-empty">Aucun résultat pour « {query.trim()} »</div>
                        )}

                        {results?.groups.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-label">Groupes</div>
                                {results.groups.map(g => (
                                    <div key={g.id} className="search-row" onMouseDown={() => go(`/groups/${g.id}`)}>
                                        <span className="search-row-dot" style={{ backgroundColor: g.color }}></span>
                                        <span className="search-row-title">{g.name}</span>
                                        <span className="search-row-sub">{g.description}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results?.concerts.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-label">Concerts</div>
                                {results.concerts.map(c => (
                                    <div key={c.id} className="search-row" onMouseDown={() => go('/concerts')}>
                                        <span className="search-row-icon">🎤</span>
                                        <span className="search-row-title">{c.name}</span>
                                        <span className="search-row-sub">{c.location}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {results?.songs.length > 0 && (
                            <div className="search-section">
                                <div className="search-section-label">Morceaux</div>
                                {results.songs.map(s => (
                                    <div key={s.id} className="search-row" onMouseDown={() => go(`/groups/${s.group_id}`)}>
                                        <span className="search-row-icon">🎵</span>
                                        <span className="search-row-title">{s.title}</span>
                                        <span className="search-row-sub">{s.artist}{s.groups?.name ? ` · ${s.groups.name}` : ''}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {profile && (
                <div className="topbar-user">
                    <Avatar name={profile.username} size={34} />
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Users, Mic2, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import Avatar from './Avatar';

const navLinks = [
    { href: '/', icon: Calendar, label: 'Calendrier' },
    { href: '/groups', icon: Users, label: 'Groupes' },
    { href: '/concerts', icon: Mic2, label: 'Concerts' },
];

const monthNames = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];

export default function Sidebar() {
    const { profile, signOut } = useAuth();
    const pathname = usePathname();
    const [upcomingConcerts, setUpcomingConcerts] = useState([]);

    useEffect(() => {
        const fetchUpcoming = async () => {
            const today = new Date().toISOString().split('T')[0];
            const { data } = await supabase
                .from('concerts')
                .select('id, name, date, location')
                .gte('date', today)
                .order('date')
                .limit(3);
            setUpcomingConcerts(data || []);
        };
        fetchUpcoming();
    }, [pathname]);

    return (
        <>
            {/* Sidebar console (desktop) */}
            <aside className="glass-rail fixed left-0 top-0 z-40 hidden h-screen w-[260px] flex-col border-r border-white/[0.06] p-5 md:flex">
                {/* Marque : témoin VU + nom */}
                <div className="mb-6 flex items-center gap-3 border-b border-border pb-5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-panel ring-1 ring-border">
                        <span className="flex h-4 items-end gap-[2px]">
                            <span className="w-[3px] animate-pulse bg-signal" style={{ height: '45%' }} />
                            <span className="w-[3px] bg-signal" style={{ height: '100%' }} />
                            <span className="w-[3px] bg-signal/60" style={{ height: '65%' }} />
                        </span>
                    </span>
                    <div className="leading-tight">
                        <div className="font-caps text-lg font-extrabold uppercase tracking-normal text-cream">Mecazic</div>
                        <div className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">Salle &amp; scène</div>
                    </div>
                </div>

                {/* Navigation = canaux */}
                <nav className="flex flex-col gap-1">
                    {navLinks.map(({ href, icon: Icon, label }) => {
                        const active = pathname === href;
                        return (
                            <Link
                                key={href}
                                href={href}
                                className={cn(
                                    'group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                                    active ? 'bg-panel text-cream' : 'text-muted-foreground hover:bg-panel/60 hover:text-cream'
                                )}
                            >
                                {active && (
                                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-signal" />
                                )}
                                <Icon className={cn('h-[18px] w-[18px]', active ? 'text-signal' : 'text-muted-foreground group-hover:text-cream')} />
                                <span>{label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="flex-1" />

                {/* Prochains concerts */}
                {upcomingConcerts.length > 0 && (
                    <div className="border-t border-border pt-4">
                        <div className="mb-2 px-1 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            En scène
                        </div>
                        <div className="flex flex-col gap-1">
                            {upcomingConcerts.map((c) => {
                                const d = new Date(c.date + 'T00:00:00');
                                return (
                                    <Link key={c.id} href="/concerts" className="flex items-center gap-3 rounded-md px-1.5 py-1.5 transition-colors hover:bg-panel">
                                        <span className="flex h-10 w-9 flex-col items-center justify-center rounded-sm border border-border bg-panel">
                                            <span className="font-mono text-sm font-bold leading-none text-cream">{d.getDate()}</span>
                                            <span className="text-[9px] font-semibold tracking-wider text-signal">{monthNames[d.getMonth()]}</span>
                                        </span>
                                        <span className="flex min-w-0 flex-col">
                                            <span className="truncate text-[13px] font-semibold text-cream">{c.name}</span>
                                            {c.location && <span className="truncate text-[11px] text-muted-foreground">{c.location}</span>}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Bloc utilisateur */}
                {profile && (
                    <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                        <Avatar name={profile.username} size={36} />
                        <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-semibold text-cream">{profile.username}</div>
                            <div className="truncate text-[11px] text-muted-foreground">
                                {profile.groups?.length > 0 ? profile.groups.map((g) => g.name).join(', ') : 'Sans groupe'}
                            </div>
                        </div>
                        <button
                            onClick={signOut}
                            title="Déconnexion"
                            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-panel hover:text-vu"
                        >
                            <LogOut className="h-4 w-4" />
                        </button>
                    </div>
                )}
            </aside>

            {/* Barre de navigation mobile */}
            <nav className="glass-rail fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/[0.06] px-2 py-2 md:hidden">
                {navLinks.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href;
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={cn('flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] font-medium', active ? 'text-signal' : 'text-muted-foreground')}
                        >
                            <Icon className="h-5 w-5" />
                            <span>{label}</span>
                        </Link>
                    );
                })}
                <button onClick={signOut} className="flex flex-col items-center gap-0.5 rounded-md px-3 py-1 text-[10px] font-medium text-muted-foreground">
                    <LogOut className="h-5 w-5" />
                    <span>Quitter</span>
                </button>
            </nav>
        </>
    );
}

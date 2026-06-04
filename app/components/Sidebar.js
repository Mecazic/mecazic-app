'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Avatar from './Avatar';

export default function Sidebar() {
    const { profile, signOut } = useAuth();
    const pathname = usePathname();
    const [upcomingConcerts, setUpcomingConcerts] = useState([]);

    const navLinks = [
        { href: '/', icon: '📅', label: 'Calendrier' },
        { href: '/groups', icon: '🎸', label: 'Groupes' },
        { href: '/concerts', icon: '🎤', label: 'Concerts' },
    ];

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

    const monthNames = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEP', 'OCT', 'NOV', 'DÉC'];

    return (
        <>
            {/* Desktop Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-logo">
                    <div className="sidebar-logo-icon">🎵</div>
                    <h1>Mecazic</h1>
                </div>

                <nav className="sidebar-nav">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}
                        >
                            <span className="sidebar-link-icon">{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}
                </nav>

                {upcomingConcerts.length > 0 && (
                    <div className="sidebar-upcoming">
                        <div className="sidebar-section-title">Prochains concerts</div>
                        {upcomingConcerts.map((c) => {
                            const d = new Date(c.date + 'T00:00:00');
                            return (
                                <Link key={c.id} href="/concerts" className="sidebar-concert-row">
                                    <span className="sidebar-concert-date">
                                        <span className="sidebar-concert-day">{d.getDate()}</span>
                                        <span className="sidebar-concert-month">{monthNames[d.getMonth()]}</span>
                                    </span>
                                    <span className="sidebar-concert-info">
                                        <span className="sidebar-concert-name">{c.name}</span>
                                        {c.location && <span className="sidebar-concert-loc">{c.location}</span>}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {profile && (
                    <div className="sidebar-user">
                        <Avatar name={profile.username} size={38} />
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{profile.username}</div>
                            <div className="sidebar-user-group">
                                {profile.groups?.length > 0
                                    ? profile.groups.map(g => g.name).join(', ')
                                    : 'Pas de groupe'}
                            </div>
                        </div>
                        <button
                            className="btn btn-ghost btn-icon"
                            onClick={signOut}
                            title="Déconnexion"
                        >
                            🚪
                        </button>
                    </div>
                )}
            </aside>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-nav">
                {navLinks.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={`mobile-nav-link ${pathname === link.href ? 'active' : ''}`}
                    >
                        <span className="mobile-nav-link-icon">{link.icon}</span>
                        <span>{link.label}</span>
                    </Link>
                ))}
                <button
                    className="mobile-nav-link"
                    onClick={signOut}
                >
                    <span className="mobile-nav-link-icon">🚪</span>
                    <span>Quitter</span>
                </button>
            </nav>
        </>
    );
}

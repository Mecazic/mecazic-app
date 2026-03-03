'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar() {
    const { profile, signOut } = useAuth();
    const pathname = usePathname();

    const navLinks = [
        { href: '/', icon: '📅', label: 'Calendrier' },
        { href: '/groups', icon: '🎸', label: 'Groupes' },
        { href: '/concerts', icon: '🎤', label: 'Concerts' },
    ];

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    };

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

                {profile && (
                    <div className="sidebar-user">
                        <div className="sidebar-user-avatar">
                            {getInitials(profile.username)}
                        </div>
                        <div className="sidebar-user-info">
                            <div className="sidebar-user-name">{profile.username}</div>
                            <div className="sidebar-user-group">
                                {profile.groups?.name || 'Pas de groupe'}
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

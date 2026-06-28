'use client';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Layout commun des pages connectées : sidebar console + master strip + contenu
export default function AppShell({ children }) {
    return (
        <div className="relative min-h-screen bg-console text-foreground">
            {/* Matière : lueur + vignette + grain de rack, derrière tout le contenu */}
            <div className="console-fx pointer-events-none fixed inset-0 z-0" aria-hidden="true" />
            <Sidebar />
            <main className="relative z-10 min-h-screen px-4 pb-24 md:ml-[260px] md:px-8 md:pb-10">
                <Topbar />
                {children}
            </main>
        </div>
    );
}

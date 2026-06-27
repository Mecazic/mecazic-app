'use client';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Layout commun des pages connectées : sidebar console + master strip + contenu
export default function AppShell({ children }) {
    return (
        <div className="min-h-screen bg-console text-foreground">
            <Sidebar />
            <main className="min-h-screen px-4 pb-24 md:ml-[260px] md:px-8 md:pb-10">
                <Topbar />
                {children}
            </main>
        </div>
    );
}

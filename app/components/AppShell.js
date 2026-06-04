'use client';

import Sidebar from './Sidebar';
import Topbar from './Topbar';

// Layout commun des pages connectées : sidebar + topbar + contenu
export default function AppShell({ children }) {
    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <Topbar />
                {children}
            </main>
        </div>
    );
}

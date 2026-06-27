'use client';

import { useAuth } from './contexts/AuthContext';
import AppShell from './components/AppShell';
import Calendar from './components/Calendar';
import LoginPage from './login/LoginPage';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-console">
        <Loader2 className="h-8 w-8 animate-spin text-signal" />
        <p className="font-mono text-sm text-muted-foreground">Chargement de Mecazic…</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <AppShell>
      <Calendar />
    </AppShell>
  );
}

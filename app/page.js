'use client';

import { useAuth } from './contexts/AuthContext';
import Sidebar from './components/Sidebar';
import Calendar from './components/Calendar';
import LoginPage from './login/LoginPage';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-page">
        <div className="spinner"></div>
        <p className="text-muted">Chargement de Mecazic...</p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Calendar />
      </main>
    </div>
  );
}

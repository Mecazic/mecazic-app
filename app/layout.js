import './globals.css';

import { AuthProvider } from './contexts/AuthContext';
import { PlayerProvider } from './contexts/PlayerContext';
import MiniPlayer from './components/MiniPlayer';

export const metadata = {
  title: 'Mecazic - Réservation salle de musique | ISAE-Supmeca',
  description: 'Plateforme de réservation de la salle de musique pour les groupes de l\'ISAE-Supmeca. Gérez vos créneaux de répétition facilement.',
  keywords: 'musique, réservation, salle, ISAE-Supmeca, groupes',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark" data-scroll-behavior="smooth">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0E0E10" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🎵</text></svg>" />
      </head>
      <body>
        <AuthProvider>
          <PlayerProvider>
            {children}
            <MiniPlayer />
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

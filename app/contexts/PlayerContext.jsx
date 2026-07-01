'use client';

// Lecteur audio global : un seul morceau en cours, partagé par toute l'app.
// Le composant <MiniPlayer/> (monté dans le layout racine) lit `current` et
// pilote le vrai lecteur YouTube ; il survit donc à la navigation.

import { createContext, useContext, useState, useCallback } from 'react';

const PlayerContext = createContext(null);

export function PlayerProvider({ children }) {
    const [current, setCurrent] = useState(null); // { videoId, title, artist }
    const [isPlaying, setIsPlaying] = useState(false);

    const play = useCallback((track) => {
        if (!track?.videoId) return;
        setCurrent(track);
        setIsPlaying(true);
    }, []);

    const close = useCallback(() => {
        setCurrent(null);
        setIsPlaying(false);
    }, []);

    return (
        <PlayerContext.Provider value={{ current, isPlaying, play, close, setIsPlaying }}>
            {children}
        </PlayerContext.Provider>
    );
}

export function usePlayer() {
    const ctx = useContext(PlayerContext);
    if (!ctx) throw new Error('usePlayer doit être utilisé dans un PlayerProvider');
    return ctx;
}

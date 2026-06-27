'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

export default function AddRepertoireSongModal({ groupId, onClose, onSaved }) {
    const [title, setTitle] = useState('');
    const [artist, setArtist] = useState('');
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const fetchLyrics = async (artistName, songTitle) => {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

            const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(songTitle)}`, {
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!res.ok) return null;
            const data = await res.json();
            return data.lyrics;
        } catch (err) {
            console.error('Error fetching lyrics:', err);
            return null;
        }
    };

    const extractYoutubeId = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !artist.trim()) {
            setError('Le titre et l\'artiste sont obligatoires.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            // Try fetching lyrics
            const lyrics = await fetchLyrics(artist.trim(), title.trim());

            // Validate YouTube URL
            if (youtubeUrl && !extractYoutubeId(youtubeUrl)) {
                setError('Le lien YouTube n\'est pas valide.');
                setSaving(false);
                return;
            }

            const payload = {
                group_id: groupId,
                title: title.trim(),
                artist: artist.trim(),
                youtube_url: youtubeUrl.trim() || null,
                lyrics: lyrics || null,
            };

            const { error: err } = await supabase
                .from('group_repertoire')
                .insert(payload);

            if (err) throw err;
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const labelClass = 'font-mono text-[11px] uppercase tracking-wider text-muted-foreground';

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display uppercase tracking-tight text-cream">
                        Ajouter au répertoire
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Titre du morceau *</label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Zombie"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Artiste / Groupe *</label>
                        <Input
                            type="text"
                            value={artist}
                            onChange={(e) => setArtist(e.target.value)}
                            placeholder="Ex : The Cranberries"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Lien YouTube (optionnel)</label>
                        <Input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=…"
                        />
                        <small className="text-xs text-muted-foreground">
                            Laisse vide pour générer automatiquement une recherche YouTube.
                        </small>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-md border border-vu/30 bg-vu/10 px-3 py-2 text-sm text-vu">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mt-2 flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Annuler
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Ajout en cours…' : 'Ajouter'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

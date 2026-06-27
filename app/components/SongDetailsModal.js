'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/app/contexts/AuthContext';
import { Trash2, Pencil, ExternalLink, Music } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';

export default function SongDetailsModal({ song, onClose, onUpdated }) {
    const [isEditingLyrics, setIsEditingLyrics] = useState(false);
    const [lyricsContent, setLyricsContent] = useState(song?.lyrics || '');
    const [saving, setSaving] = useState(false);
    const { profile } = useAuth();
    const isAdmin = profile?.role === 'admin';

    const handleSaveLyrics = async () => {
        setSaving(true);
        try {
            const { error } = await supabase
                .from('group_repertoire')
                .update({ lyrics: lyricsContent })
                .eq('id', song.id);

            if (error) throw error;
            setIsEditingLyrics(false);
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Es-tu sûr de vouloir supprimer "${song.title}" du répertoire ?`)) return;

        try {
            const { error } = await supabase
                .from('group_repertoire')
                .delete()
                .eq('id', song.id);

            if (error) throw error;
            onClose();
            if (onUpdated) onUpdated();
        } catch (err) {
            console.error(err);
        }
    };

    // Helper to get video ID
    const getYoutubeEmbed = (url) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYoutubeEmbed(song?.youtube_url);
    const searchQuery = encodeURIComponent(`${song?.artist} ${song?.title}`);

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-3xl">
                <DialogHeader className="pr-8">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <DialogTitle className="font-display uppercase tracking-tight text-cream">
                                {song?.title}
                            </DialogTitle>
                            <div className="mt-0.5 font-mono text-xs text-muted-foreground">{song?.artist}</div>
                        </div>
                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                onClick={handleDelete}
                                title="Supprimer la chanson"
                                className="text-vu hover:bg-vu/10 hover:text-vu"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="flex max-h-[75vh] flex-col gap-6 overflow-y-auto">
                    {/* Media + partitions */}
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="overflow-hidden rounded-lg border border-border bg-panel">
                            {videoId ? (
                                <iframe
                                    width="100%"
                                    height="250"
                                    src={`https://www.youtube.com/embed/${videoId}`}
                                    title="YouTube video player"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="block"
                                ></iframe>
                            ) : (
                                <div className="flex h-[250px] flex-col items-center justify-center gap-3 p-4 text-center">
                                    <Music className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-sm text-muted-foreground">Aucun lien YouTube défini</div>
                                    <Button asChild variant="outline" size="sm">
                                        <a
                                            href={`https://www.youtube.com/results?search_query=${searchQuery}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            Rechercher sur YouTube
                                            <ExternalLink className="h-3.5 w-3.5" />
                                        </a>
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-3">
                            <h3 className="font-display text-base font-semibold uppercase tracking-tight text-cream">
                                Partitions et tablatures
                            </h3>
                            <Button asChild className="bg-signal text-console hover:bg-signal/90">
                                <a
                                    href={`https://www.songsterr.com/a/wa/bestMatchForQueryString?s=${encodeURIComponent(song?.title)}&a=${encodeURIComponent(song?.artist)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Ouvrir dans Songsterr
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                            <Button asChild variant="outline">
                                <a
                                    href={`https://www.ultimate-guitar.com/search.php?search_type=title&value=${searchQuery}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Ouvrir dans Ultimate Guitar
                                    <ExternalLink className="h-4 w-4" />
                                </a>
                            </Button>
                        </div>
                    </div>

                    {/* Paroles */}
                    <div>
                        <div className="mb-3 flex items-center justify-between">
                            <h3 className="font-display text-base font-semibold uppercase tracking-tight text-cream">
                                Paroles
                            </h3>
                            {!isEditingLyrics ? (
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingLyrics(true)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                    Modifier
                                </Button>
                            ) : (
                                <div className="flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => { setIsEditingLyrics(false); setLyricsContent(song?.lyrics || ''); }}
                                    >
                                        Annuler
                                    </Button>
                                    <Button size="sm" onClick={handleSaveLyrics} disabled={saving}>
                                        {saving ? '…' : 'Enregistrer'}
                                    </Button>
                                </div>
                            )}
                        </div>

                        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-panel p-4">
                            {isEditingLyrics ? (
                                <textarea
                                    className="min-h-[300px] w-full resize-y rounded-md border border-input bg-transparent p-3 font-mono text-sm text-cream outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                    value={lyricsContent}
                                    onChange={(e) => setLyricsContent(e.target.value)}
                                    rows={15}
                                />
                            ) : lyricsContent ? (
                                <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-cream/90">
                                    {lyricsContent}
                                </div>
                            ) : (
                                <div className="flex h-[100px] items-center justify-center italic text-muted-foreground">
                                    Aucune parole disponible pour ce morceau.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

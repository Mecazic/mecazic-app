'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

export default function SongModal({ setId, song, currentOrder, onClose, onSaved }) {
    const [title, setTitle] = useState(song?.title || '');
    const [minutes, setMinutes] = useState(song ? Math.floor(song.duration_seconds / 60) : 3);
    const [seconds, setSeconds] = useState(song ? song.duration_seconds % 60 : 0);
    const [assignments, setAssignments] = useState(song?.assignments || '');
    const [notes, setNotes] = useState(song?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Le titre est obligatoire.');
            return;
        }

        setSaving(true);
        setError('');

        const durationSeconds = (minutes * 60) + seconds;

        try {
            const payload = {
                title: title.trim(),
                duration_seconds: durationSeconds,
                assignments: assignments.trim(),
                notes: notes.trim(),
            };

            if (song) {
                const { error: err } = await supabase
                    .from('set_songs')
                    .update(payload)
                    .eq('id', song.id);
                if (err) throw err;
            } else {
                const { error: err } = await supabase
                    .from('set_songs')
                    .insert({
                        ...payload,
                        set_id: setId,
                        song_order: currentOrder,
                    });
                if (err) throw err;
            }
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const labelClass = 'font-mono text-[11px] uppercase tracking-wider text-muted-foreground';
    const textareaClass = 'w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm text-cream outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display uppercase tracking-tight text-cream">
                        {song ? 'Modifier la chanson' : 'Ajouter une chanson'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Titre de la chanson *</label>
                        <Input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ex : Highway to Hell"
                            autoFocus
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Durée</label>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5">
                                <Input
                                    type="number"
                                    className="w-20 text-center font-mono"
                                    value={minutes}
                                    onChange={(e) => setMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                                    min="0"
                                    max="30"
                                />
                                <span className="text-sm text-muted-foreground">min</span>
                            </div>
                            <span className="text-lg font-bold text-muted-foreground">:</span>
                            <div className="flex items-center gap-1.5">
                                <Input
                                    type="number"
                                    className="w-20 text-center font-mono"
                                    value={seconds}
                                    onChange={(e) => setSeconds(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                                    min="0"
                                    max="59"
                                />
                                <span className="text-sm text-muted-foreground">sec</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Qui joue quoi ?</label>
                        <textarea
                            className={textareaClass}
                            value={assignments}
                            onChange={(e) => setAssignments(e.target.value)}
                            placeholder="Ex : Tom → guitare lead, Léa → chant, Max → batterie"
                            rows={2}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Notes</label>
                        <textarea
                            className={textareaClass}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Remarques, tempo, tonalité…"
                            rows={2}
                        />
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
                            {saving ? 'Enregistrement…' : (song ? 'Modifier' : 'Ajouter')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

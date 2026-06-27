'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { TimeField } from '@/app/components/ui/date-time-field';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/lib/utils';

export default function SetModal({ concertId, set, groups, currentOrder, onClose, onSaved }) {
    const [groupId, setGroupId] = useState(set?.group_id || '');
    const [startTime, setStartTime] = useState(set?.start_time?.slice(0, 5) || '');
    const [durationMinutes, setDurationMinutes] = useState(set?.duration_minutes || 30);
    const [notes, setNotes] = useState(set?.notes || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!groupId) {
            setError('Sélectionne un groupe.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            const payload = {
                group_id: groupId,
                start_time: startTime || null,
                duration_minutes: durationMinutes,
                notes: notes.trim(),
            };

            if (set) {
                const { error: err } = await supabase
                    .from('concert_sets')
                    .update(payload)
                    .eq('id', set.id);
                if (err) throw err;
            } else {
                const { error: err } = await supabase
                    .from('concert_sets')
                    .insert({
                        ...payload,
                        concert_id: concertId,
                        set_order: currentOrder,
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

    const durationOptions = [15, 20, 30, 45, 60, 90, 120];
    const selectedGroup = groups.find(g => g.id === groupId);
    const labelClass = 'font-mono text-[11px] uppercase tracking-wider text-muted-foreground';

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display uppercase tracking-tight text-cream">
                        {set ? 'Modifier le passage' : 'Ajouter un passage'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Groupe *</label>
                        <select
                            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm text-cream outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            value={groupId}
                            onChange={(e) => setGroupId(e.target.value)}
                        >
                            <option value="">Sélectionner un groupe…</option>
                            {groups.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.name}
                                </option>
                            ))}
                        </select>
                        {selectedGroup && (
                            <div className="mt-1.5 flex items-center gap-2">
                                <span
                                    className="h-3 w-3 rounded-full"
                                    style={{ backgroundColor: selectedGroup.color || '#666' }}
                                />
                                <span className="text-xs text-muted-foreground">
                                    {selectedGroup.description || ''}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Heure de début</label>
                        <TimeField
                            value={startTime}
                            onChange={setStartTime}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Durée du passage</label>
                        <div className="flex flex-wrap gap-2">
                            {durationOptions.map(d => (
                                <button
                                    key={d}
                                    type="button"
                                    onClick={() => setDurationMinutes(d)}
                                    className={cn(
                                        'rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors',
                                        durationMinutes === d
                                            ? 'border-signal bg-signal/15 text-signal'
                                            : 'border-border bg-panel text-muted-foreground hover:border-signal/50 hover:text-cream'
                                    )}
                                >
                                    {d} min
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Notes</label>
                        <textarea
                            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm text-cream outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Infos supplémentaires sur le passage…"
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
                            {saving ? 'Enregistrement…' : (set ? 'Modifier' : 'Ajouter')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

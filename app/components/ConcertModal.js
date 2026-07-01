'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { DateField } from '@/app/components/ui/date-time-field';
import { Button } from '@/app/components/ui/button';

export default function ConcertModal({ concert, onClose, onSaved, userId }) {
    const [name, setName] = useState(concert?.name || '');
    const [date, setDate] = useState(concert?.date || '');
    const [location, setLocation] = useState(concert?.location || '');
    const [description, setDescription] = useState(concert?.description || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim() || !date) {
            setError('Le nom et la date sont obligatoires.');
            return;
        }

        setSaving(true);
        setError('');

        try {
            if (concert) {
                // Update
                const { error: err } = await supabase
                    .from('concerts')
                    .update({ name: name.trim(), date, location: location.trim(), description: description.trim() })
                    .eq('id', concert.id);
                if (err) throw err;
            } else {
                // Create
                const { error: err } = await supabase
                    .from('concerts')
                    .insert({
                        name: name.trim(),
                        date,
                        location: location.trim(),
                        description: description.trim(),
                        created_by: userId,
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

    const labelClass = 'text-[11px] font-medium uppercase tracking-wider text-muted-foreground';

    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="border-border bg-card sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="font-display tracking-normal text-cream">
                        {concert ? 'Modifier le concert' : 'Nouveau concert'}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Nom du concert *</label>
                        <Input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex : Concert de fin d'année"
                            autoFocus
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Date *</label>
                        <DateField
                            value={date}
                            onChange={setDate}
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Lieu</label>
                        <Input
                            type="text"
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            placeholder="Ex : Amphi ISAE-Supméca"
                        />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Description</label>
                        <textarea
                            className="w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm text-cream outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Infos supplémentaires…"
                            rows={3}
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
                            {saving ? 'Enregistrement…' : (concert ? 'Modifier' : 'Créer')}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}

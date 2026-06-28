'use client';

// Upload d'image vers Supabase Storage (bucket public `group-assets`).
// Deux formats : `avatar` (carré) et `banner` (large). La VALEUR remontée à
// onChange est l'URL publique de l'image (ou '' après suppression).

import { useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Upload, Loader2, ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ImageUpload({ groupId, kind = 'avatar', value, onChange, label }) {
    const inputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const isBanner = kind === 'banner';

    const pick = () => inputRef.current?.click();

    const handleFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permet de re-sélectionner le même fichier
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            setError('Choisis un fichier image.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            setError('Image trop lourde (max 5 Mo).');
            return;
        }
        setError('');
        setUploading(true);
        try {
            const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
            const path = `${groupId}/${kind}-${Date.now()}.${ext}`;
            const { error: upErr } = await supabase.storage
                .from('group-assets')
                .upload(path, file, { upsert: true, cacheControl: '3600' });
            if (upErr) throw upErr;
            const { data } = supabase.storage.from('group-assets').getPublicUrl(path);
            onChange(data.publicUrl);
        } catch (err) {
            console.error('Upload image groupe:', err);
            setError(err.message || "Échec de l'upload.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
            )}
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={pick}
                    className={cn(
                        'group/up relative shrink-0 overflow-hidden rounded-lg border border-white/12 bg-white/[0.04] transition-colors hover:border-signal/50',
                        isBanner ? 'h-20 w-full' : 'h-20 w-20'
                    )}
                >
                    {value ? (
                        <img src={value} alt="" className="h-full w-full object-cover" />
                    ) : (
                        <span className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                            <ImageIcon className="h-5 w-5" />
                            <span className="font-mono text-[10px] uppercase tracking-wider">Ajouter</span>
                        </span>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-console/60 opacity-0 backdrop-blur-sm transition-opacity group-hover/up:opacity-100">
                        {uploading ? (
                            <Loader2 className="h-5 w-5 animate-spin text-signal" />
                        ) : (
                            <Upload className="h-5 w-5 text-cream" />
                        )}
                    </span>
                </button>

                {value && !isBanner && (
                    <button
                        type="button"
                        onClick={() => onChange('')}
                        className="flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-vu"
                    >
                        <X className="h-3.5 w-3.5" />
                        Retirer
                    </button>
                )}
            </div>
            {value && isBanner && (
                <button
                    type="button"
                    onClick={() => onChange('')}
                    className="self-start font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-vu"
                >
                    Retirer la bannière
                </button>
            )}
            {error && <span className="text-xs text-vu">{error}</span>}
            <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
        </div>
    );
}

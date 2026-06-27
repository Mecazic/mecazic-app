'use client';

// Champs date/heure au format EUROPÉEN (JJ/MM/AAAA, HH:MM 24h), indépendants
// de la locale du navigateur — les <input type="date|time"> natifs suivent la
// locale de Chrome et ne peuvent pas être forcés en français.
//
// Contrat identique côté parent : la VALEUR reste au format ISO/standard
// (date = "AAAA-MM-JJ", heure = "HH:MM"), seul l'AFFICHAGE est européen.
// onChange reçoit directement la chaîne (pas un event), ou '' si incomplet.

import * as React from 'react';
import { Input } from '@/app/components/ui/input';

// ---------- Date : ISO (AAAA-MM-JJ) <-> FR (JJ/MM/AAAA) ----------

function isoToFr(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}

function frToIso(fr) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(fr);
    if (!m) return '';
    const d = +m[1], mo = +m[2], y = +m[3];
    const dt = new Date(y, mo - 1, d);
    // Rejette les dates impossibles (ex. 31/02)
    if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
    return `${m[3]}-${m[2]}-${m[1]}`;
}

function maskDate(input) {
    const d = input.replace(/\D/g, '').slice(0, 8); // JJMMAAAA
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

export function DateField({ value, onChange, ...props }) {
    const [text, setText] = React.useState(() => isoToFr(value));

    // Resynchronise depuis la valeur parent seulement si elle diverge réellement
    // (évite de réinitialiser le champ pendant une saisie partielle).
    React.useEffect(() => {
        if (frToIso(text) !== (value || '')) setText(isoToFr(value));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handle = (e) => {
        const masked = maskDate(e.target.value);
        setText(masked);
        onChange(frToIso(masked));
    };

    return (
        <Input
            type="text"
            inputMode="numeric"
            placeholder="JJ/MM/AAAA"
            maxLength={10}
            value={text}
            onChange={handle}
            {...props}
        />
    );
}

// ---------- Heure : HH:MM (24h) ----------

function maskTime(input) {
    const d = input.replace(/\D/g, '').slice(0, 4); // HHMM
    if (d.length <= 2) return d;
    return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function validTime(t) {
    const m = /^(\d{2}):(\d{2})$/.exec(t);
    if (!m) return '';
    if (+m[1] > 23 || +m[2] > 59) return '';
    return t;
}

export function TimeField({ value, onChange, ...props }) {
    const [text, setText] = React.useState(() => value || '');

    React.useEffect(() => {
        if (validTime(text) !== (value || '')) setText(value || '');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handle = (e) => {
        const masked = maskTime(e.target.value);
        setText(masked);
        onChange(validTime(masked));
    };

    return (
        <Input
            type="text"
            inputMode="numeric"
            placeholder="HH:MM"
            maxLength={5}
            value={text}
            onChange={handle}
            {...props}
        />
    );
}

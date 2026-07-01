'use client';

// Affiche des paroles au format ChordPro (`[Am]paroles`) avec les accords
// alignés au-dessus du texte, transposition ±demi-ton et défilement auto.
// Le texte sans accords s'affiche simplement comme des paroles.

import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, ChevronsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_TO_SHARP = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#', Cb: 'B', Fb: 'E' };

function transposeOne(chord, steps) {
    const m = chord.match(/^([A-G][#b]?)(.*)$/);
    if (!m) return chord;
    let root = m[1];
    if (root.length === 2 && root[1] === 'b') root = FLAT_TO_SHARP[root] || root;
    let idx = SHARP.indexOf(root);
    if (idx === -1) return chord;
    idx = (((idx + steps) % 12) + 12) % 12;
    return SHARP[idx] + m[2];
}

// Transpose un accord complet, slash inclus (ex. "F/G", "C#m7/G#").
function transposeChord(token, steps) {
    if (!steps) return token;
    const [main, bass] = token.split('/');
    const tx = transposeOne(main, steps);
    return bass ? `${tx}/${transposeOne(bass, steps)}` : tx;
}

// Découpe une ligne ChordPro en une ligne d'accords + une ligne de paroles,
// alignées caractère par caractère (police mono).
function parseLine(line, steps) {
    let lyrics = '';
    let chords = '';
    let i = 0;
    while (i < line.length) {
        if (line[i] === '[') {
            const end = line.indexOf(']', i);
            if (end !== -1) {
                const chord = transposeChord(line.slice(i + 1, end), steps);
                while (chords.length < lyrics.length) chords += ' ';
                chords += chord + ' ';
                i = end + 1;
                continue;
            }
        }
        lyrics += line[i];
        i += 1;
    }
    return { chords: chords.replace(/\s+$/, ''), lyrics };
}

export default function ChordSheet({ source }) {
    const [steps, setSteps] = useState(0);
    const [auto, setAuto] = useState(false);
    const [speed, setSpeed] = useState(2);
    const scrollRef = useRef(null);

    const lines = useMemo(
        () => (source || '').split('\n').map((l) => parseLine(l, steps)),
        [source, steps]
    );

    useEffect(() => {
        if (!auto) return undefined;
        const el = scrollRef.current;
        if (!el) return undefined;
        const id = setInterval(() => {
            el.scrollTop += 1;
            if (el.scrollTop + el.clientHeight >= el.scrollHeight - 1) setAuto(false);
        }, 120 - speed * 18);
        return () => clearInterval(id);
    }, [auto, speed]);

    const stepLabel = steps === 0 ? 'Tonalité' : steps > 0 ? `+${steps}` : `${steps}`;
    const ctrlBtn = 'flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:text-cream';

    return (
        <div className="flex flex-col gap-3">
            {/* Contrôles : transposition + défilement */}
            <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-md border border-border bg-panel/60 p-1">
                    <button type="button" className={ctrlBtn} onClick={() => setSteps((s) => s - 1)} aria-label="Transposer vers le bas">
                        <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[58px] text-center font-mono text-xs font-semibold text-cream">{stepLabel}</span>
                    <button type="button" className={ctrlBtn} onClick={() => setSteps((s) => s + 1)} aria-label="Transposer vers le haut">
                        <Plus className="h-3.5 w-3.5" />
                    </button>
                    {steps !== 0 && (
                        <button type="button" className={ctrlBtn} onClick={() => setSteps(0)} title="Tonalité d'origine">
                            <RotateCcw className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => setAuto((a) => !a)}
                    className={cn(
                        'flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wider transition-colors',
                        auto ? 'border-signal/50 bg-signal/15 text-signal' : 'border-border bg-panel/60 text-muted-foreground hover:text-cream'
                    )}
                >
                    <ChevronsDown className="h-3.5 w-3.5" />
                    Défilement
                </button>

                {auto && (
                    <div className="flex items-center gap-1 rounded-md border border-border bg-panel/60 p-1">
                        <button type="button" className={ctrlBtn} onClick={() => setSpeed((s) => Math.max(1, s - 1))} aria-label="Ralentir">
                            <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[28px] text-center font-mono text-xs text-muted-foreground">×{speed}</span>
                        <button type="button" className={ctrlBtn} onClick={() => setSpeed((s) => Math.min(5, s + 1))} aria-label="Accélérer">
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* Grille */}
            <div ref={scrollRef} className="max-h-[420px] overflow-y-auto rounded-lg border border-border bg-panel p-4">
                <div className="font-mono text-[13px] leading-tight">
                    {lines.map((ln, i) => {
                        if (!ln.chords && !ln.lyrics) return <div key={i} className="h-4" />;
                        return (
                            <div key={i} className="mb-1.5">
                                {ln.chords && (
                                    <div className="whitespace-pre font-semibold text-signal">{ln.chords}</div>
                                )}
                                <div className="whitespace-pre-wrap text-cream/90">{ln.lyrics || ' '}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

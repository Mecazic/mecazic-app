'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';

export default function LoginPage() {
    const { signIn, signUp } = useAuth();
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isRegister) {
                if (!username.trim()) {
                    setError('Entre ton nom ou pseudo.');
                    setLoading(false);
                    return;
                }
                const data = await signUp(email, password, username, null);
                if (data?.session) {
                    setSuccess('Compte créé, tu es connecté.');
                } else {
                    setSuccess('Compte créé. Vérifie ta boîte mail pour confirmer ton inscription.');
                }
            } else {
                await signIn(email, password);
            }
        } catch (err) {
            if (err.message.includes('Invalid login')) {
                setError('Email ou mot de passe incorrect.');
            } else if (err.message.includes('already registered')) {
                setError('Cet email est déjà utilisé.');
            } else if (err.message.includes('Email not confirmed')) {
                setError('Confirme ton email avant de te connecter (regarde ta boîte mail).');
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative flex min-h-screen items-center justify-center bg-console px-4 py-10">
            <div className="console-fx pointer-events-none fixed inset-0" aria-hidden="true" />
            <div className="relative z-10 w-full max-w-sm">
                {/* Marque : témoin VU + nom */}
                <div className="mb-8 flex flex-col items-center text-center">
                    <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg bg-panel ring-1 ring-border">
                        <span className="flex h-6 items-end gap-[3px]">
                            <span className="w-1 animate-pulse bg-signal" style={{ height: '45%' }} />
                            <span className="w-1 bg-signal" style={{ height: '100%' }} />
                            <span className="w-1 bg-signal/60" style={{ height: '65%' }} />
                        </span>
                    </span>
                    <h1 className="font-display text-3xl font-extrabold uppercase tracking-tight text-cream">Mecazic</h1>
                    <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Salle de musique · ISAE-Supméca
                    </p>
                </div>

                {/* Console de connexion */}
                <div className="glass rounded-2xl p-6 sm:p-8">
                    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className="flex flex-col gap-1.5">
                                <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Nom / Pseudo
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Ex : Jean-Pierre"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                                Email
                            </label>
                            <Input
                                type="email"
                                placeholder="ton.email@supmeca.fr"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                                Mot de passe
                            </label>
                            <Input
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <div className="flex items-center gap-2 rounded-md border border-vu/30 bg-vu/10 px-3 py-2 text-sm text-vu">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}

                        {success && (
                            <div className="flex items-center gap-2 rounded-md border border-chart-3/30 bg-chart-3/10 px-3 py-2 text-sm text-chart-3">
                                <CheckCircle2 className="h-4 w-4 shrink-0" />
                                <span>{success}</span>
                            </div>
                        )}

                        <Button type="submit" disabled={loading} className="mt-1 w-full">
                            {loading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isRegister ? (
                                'Créer mon compte'
                            ) : (
                                'Se connecter'
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center font-mono text-xs text-muted-foreground">
                        {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                        <button
                            type="button"
                            className="ml-1.5 font-semibold text-signal transition-colors hover:text-signal/80"
                            onClick={() => {
                                setIsRegister(!isRegister);
                                setError('');
                                setSuccess('');
                            }}
                        >
                            {isRegister ? 'Se connecter' : 'Créer un compte'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

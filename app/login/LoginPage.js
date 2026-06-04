'use client';

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

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
                    setSuccess('🎉 Compte créé ! Tu es connecté.');
                } else {
                    setSuccess('📬 Compte créé ! Vérifie ta boîte mail pour confirmer ton inscription.');
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
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-brand">
                        <div className="auth-brand-icon">🎵</div>
                        <h1>Mecazic</h1>
                        <p>Salle de musique · ISAE-Supmeca</p>
                    </div>

                    <form className="auth-form" onSubmit={handleSubmit}>
                        {isRegister && (
                            <div className="form-group">
                                <label className="form-label">Nom / Pseudo</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Jean-Pierre"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                placeholder="ton.email@supmeca.fr"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Mot de passe</label>
                            <input
                                type="password"
                                className="form-input"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        {error && (
                            <div className="form-error">⚠️ {error}</div>
                        )}

                        {success && (
                            <div style={{ fontSize: '0.88rem', color: 'var(--accent-success)' }}>
                                {success}
                            </div>
                        )}

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={loading}
                            style={{ width: '100%', marginTop: '8px' }}
                        >
                            {loading ? (
                                <span className="spinner"></span>
                            ) : isRegister ? (
                                '🎸 Créer mon compte'
                            ) : (
                                '🎵 Se connecter'
                            )}
                        </button>
                    </form>

                    <div className="auth-toggle">
                        {isRegister ? 'Déjà un compte ?' : 'Pas encore de compte ?'}
                        <button
                            className="auth-toggle-btn"
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

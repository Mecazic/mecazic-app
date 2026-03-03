'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const getSession = async () => {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                }
            } catch (err) {
                console.error("Auth init error:", err);
            } finally {
                setLoading(false);
            }
        };

        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (session?.user) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            }
        );

        fetchGroups();

        return () => subscription?.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        let { data, error } = await supabase
            .from('profiles')
            .select(`
                *,
                group_members(group_id, role, groups(*))
            `)
            .eq('id', userId)
            .single();

        // If profile doesn't exist, create it automatically
        if (!data || (error && error.code === 'PGRST116')) {
            const { data: authData } = await supabase.auth.getUser();
            const authUser = authData?.user;

            if (authUser && authUser.id === userId) {
                const { data: newProfile, error: insertError } = await supabase
                    .from('profiles')
                    .insert({
                        id: authUser.id,
                        username: authUser.user_metadata?.username || authUser.email?.split('@')[0] || 'Utilisateur',
                        email: authUser.email || '',
                    })
                    .select(`
                        *,
                        group_members(group_id, role, groups(*))
                    `)
                    .single();

                if (!insertError && newProfile) {
                    data = newProfile;
                } else {
                    console.error("Failed to auto-create profile:", insertError);
                }
            }
        }
        if (data) {
            // Normalize groups array for easier use in components
            data.groups = data.group_members
                ? data.group_members.map(gm => ({ ...gm.groups, role: gm.role }))
                : [];
        }

        setProfile(data);
    };

    const fetchGroups = async () => {
        const { data } = await supabase
            .from('groups')
            .select('*')
            .order('name');
        setGroups(data || []);
    };

    const signUp = async (email, password, username, groupId) => {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { username }
            }
        });

        if (error) throw error;

        if (data.user && groupId) {
            await supabase
                .from('group_members')
                .insert({ user_id: data.user.id, group_id: groupId, role: 'member' });

            // Keep legacy field updated for backward compatibility temporarily
            await supabase
                .from('profiles')
                .update({ group_id: groupId })
                .eq('id', data.user.id);
        }

        return data;
    };

    const signIn = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            groups,
            loading,
            signUp,
            signIn,
            signOut,
            fetchProfile,
            fetchGroups,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);

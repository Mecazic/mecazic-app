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
                try {
                    if (session?.user) {
                        setUser(session.user);
                        // Only re-fetch profile on sign-in or if user changed, not on TOKEN_REFRESHED
                        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
                            await fetchProfile(session.user.id);
                        }
                    } else {
                        setUser(null);
                        setProfile(null);
                    }
                } catch (err) {
                    console.error("Erreur dans onAuthStateChange:", err);
                }
            }
        );

        fetchGroups();

        return () => subscription?.unsubscribe();
    }, []);

    const fetchProfile = async (userId) => {
        try {
            // First try to fetch just the basic profile
            let { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();

            // If profile doesn't exist, create it automatically
            if (!profileData || (profileError && profileError.code === 'PGRST116')) {
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
                        .select()
                        .single();

                    if (!insertError && newProfile) {
                        profileData = newProfile;
                    } else {
                        throw insertError || new Error("Failed to auto-create profile");
                    }
                } else {
                    setProfile(null);
                    return;
                }
            } else if (profileError) {
                throw profileError;
            }

            // Now, fetch all group memberships for this user separately
            // This avoids the complex nested join that PostgREST struggles with
            if (profileData) {
                const { data: memberships, error: memberError } = await supabase
                    .from('group_members')
                    .select('group_id, role, groups(*)')
                    .eq('user_id', userId);

                if (memberError) {
                    console.error("Error fetching group memberships:", memberError);
                    profileData.groups = [];
                    // Keep legacy backward compatibility temporarily
                    profileData.group_id = profileData.group_id || null;
                } else {
                    // Normalize groups array for easier use in components
                    profileData.groups = memberships
                        ? memberships.filter(m => m.groups).map(m => ({ ...m.groups, role: m.role }))
                        : [];

                    // Set legacy group_id if they have at least one group
                    profileData.group_id = profileData.groups.length > 0 ? profileData.groups[0].id : null;
                }
            }

            setProfile(profileData);
        } catch (err) {
            console.error("Error in fetchProfile:", err);
            setProfile(null);
        }
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
            try {
                await supabase
                    .from('group_members')
                    .insert({ user_id: data.user.id, group_id: groupId, role: 'member' });

                // Keep legacy field updated for backward compatibility temporarily
                await supabase
                    .from('profiles')
                    .update({ group_id: groupId })
                    .eq('id', data.user.id);
            } catch (err) {
                console.error("Error adding joined group during signup:", err);
            }
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

import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserProfile } from '../types/database';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const signIn = async (email: string, password: string) => {
    console.log('Attempting to sign in with:', { email });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Sign in error:', error);
        return { data: null, error };
      }
      
      console.log('Sign in successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error during sign in:', error);
      return { data: null, error: error as Error };
    }
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    console.log('Attempting to sign up with:', { email, displayName });
    try {
      // First, sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName,
            // Add user metadata that will be available in raw_user_meta_data
            display_name: displayName,
            name: displayName
          },
          emailRedirectTo: new URL('/auth/callback', window.location.origin).href
        }
      });
      
      if (error) {
        console.error('Sign up error:', error);
        return { data: null, error };
      }

      // If we have a user, make sure their profile exists
      if (data.user) {
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: data.user.id,
            display_name: displayName || email.split('@')[0],
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error('Error creating user profile:', profileError);
          // Don't fail the signup if profile creation fails, just log it
        }
      }
      
      console.log('Sign up successful:', data);
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error during sign up:', error);
      return { data: null, error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: new URL('/auth/callback', window.location.origin).href,
          queryParams: {
            access_type: 'offline',
          }
        }
      });
      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Unexpected error during Google sign in:', error);
      return { data: null, error: error as Error };
    }
  };
  
  const handleAuthCallback = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session in auth callback:', error);
        return { error };
      }
      
      if (session?.user) {
        setSession(session);
        setUser(session.user);
        await fetchProfile(session.user.id);
        return { session, error: null };
      }
      
      return { session: null, error: new Error('No session found') };
    } catch (error) {
      console.error('Error in auth callback:', error);
      return { session: null, error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      // Use local scope to clear current device session
      const { error } = await supabase.auth.signOut({ scope: 'local' as any });
      if (error) console.error('Supabase signOut error:', error);
      return { error };
    } catch (e) {
      console.error('Supabase signOut exception:', e);
      return { error: e as any };
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return { error: new Error('No user logged in') };

    const { data, error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (data && !error) {
      setProfile(data);
    }

    return { data, error };
  };

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    updateProfile,
    handleAuthCallback,
    fetchProfile
  };
}
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/clients/supabaseClient';
import { authService, userService } from '@/services/storage/RepositoryFactory';
import { UserProfile } from '@/types/shared';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (user) {
      const { profile: userProfile } = await userService.getUserProfile(user.id);
      setProfile(userProfile);
    } else {
      setProfile(null);
    }
  };

  useEffect(() => {
    // Check active sessions and set the user
    const initAuth = async () => {
      // Safety timeout: never block more than 5 seconds
      const timeoutId = setTimeout(() => setLoading(false), 5000);

      try {
        const { user: currentUser } = await authService.getCurrentUser();
        setUser(currentUser);

        // Unblock the UI as soon as we have the authentication status
        setLoading(false);
        clearTimeout(timeoutId);

        if (currentUser) {
          const { profile: userProfile } = await userService.getUserProfile(currentUser.id);
          setProfile(userProfile);
        }
      } catch (err) {
        console.error('Error during initAuth:', err);
        setLoading(false);
        clearTimeout(timeoutId);
      }
    };

    initAuth();

    // Listen for changes on auth state (logged in, signed out, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        // Unblock immediately on state change
        setLoading(false);

        if (currentUser) {
          const { profile: userProfile } = await userService.getUserProfile(currentUser.id);
          setProfile(userProfile);
        } else {
          setProfile(null);
        }
      } catch (err) {
        console.error('Error during onAuthStateChange:', err);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await authService.logout();
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

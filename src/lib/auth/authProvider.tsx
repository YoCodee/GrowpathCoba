"use client";

import { useState, useEffect, useContext, createContext, ReactNode } from 'react';
import { supabase } from '../../.././lib/supabase'; // Pastikan path ke supabase.js benar
import { useRouter } from 'next/navigation';
import { User } from '@supabase/supabase-js';

// Tentukan tipe data untuk context
interface AuthContextType {
  user: User | null;
  profile: { name: string; role: 'admin' | 'tenant' | null; } | null;
  role: 'admin' | 'tenant' | null;
  loading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ name: string; role: 'admin' | 'tenant' | null; } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fungsi untuk mengambil data role dari tabel 'profiles'
  const fetchUserProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select(`name, role`)
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile({ name: data.name, role: data.role as 'admin' | 'tenant' });
    } else {
      console.error("Profile not found for user:", error);
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    // 1. Ambil sesi saat ini
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
            setUser(session.user);
            fetchUserProfile(session.user.id);
        } else {
            setUser(null);
            setProfile(null);
            setLoading(false);
        }
    });

    // 2. Listener untuk perubahan sesi (login/logout)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
            setUser(session.user);
            fetchUserProfile(session.user.id);
        } else if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setLoading(false);
            router.push('/login'); // Redirect ke login saat logout
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role = profile ? profile.role : null;

  return (
    <AuthContext.Provider value={{ user, profile, role, loading, signOut }}>
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

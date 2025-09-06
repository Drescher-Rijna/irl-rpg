'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { getUserProfile } from '@/lib/user';

export function useAuthSession() {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // 1. Check current session on load
    const session = supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await getUserProfile(data.session.user.id);
        setUser({
          id: data.session.user.id,
          email: profile.email,
          username: profile.username,
        });
      }
    });

    // 2. Listen for auth changes (sign in/out)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);
          setUser({
            id: session.user.id,
            email: profile.email,
            username: profile.username,
          });
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [setUser]);
}

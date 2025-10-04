// hooks/useAuthSession.ts
'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { getUserProfile } from '@/lib/user';

export function useAuthSession() {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        try {
          const profile = await getUserProfile(data.session.user.id);
          if (profile) {
            setUser(profile);
          } else {
            // fallback
            setUser({
              id: data.session.user.id,
              email: data.session.user.email ?? '',
              username: null,
              level: 1,
              xp_current: 0,
              xp_total: 0,
              wild_slots: 0,
            } as any);
          }
        } catch (err) {
          console.error('useAuthSession get profile failed', err);
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        try {
          const profile = await getUserProfile(session.user.id);
          if (profile) setUser(profile);
        } catch (err) {
          console.warn('Auth change: failed to load profile', err);
        }
      } else {
        setUser(null);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [setUser]);
}

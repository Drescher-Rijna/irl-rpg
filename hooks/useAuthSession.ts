'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { getUserProfile } from '@/lib/user';

export function useAuthSession() {
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    // 1. Check current session on load
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session?.user) {
        const profile = await getUserProfile(data.session.user.id);

        if (profile) {
          setUser({
            id: data.session.user.id,
            email: profile.email,
            username: profile.username,
            level: profile.level,
            xp_current: profile.xp_current,
            xp_total: profile.xp_total,
            wild_slots: profile.wild_slots,
          });
        } else {
          console.warn('[useAuthSession] No profile found for user', data.session.user.id);
          // Optional: create a placeholder user in store
          setUser({
            id: data.session.user.id,
            email: data.session.user.email ?? '',
            username: null,
            level: 1,
            xp_current: 0,
            xp_total: 0,
            wild_slots: 0,
          });
        }
      }
    });

    // 2. Listen for auth changes (sign in/out)
    const { data: listener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await getUserProfile(session.user.id);

          if (profile) {
            setUser({
              id: session.user.id,
              email: profile.email,
              username: profile.username,
              level: profile.level,
              xp_current: profile.xp_current,
              xp_total: profile.xp_total,
              wild_slots: profile.wild_slots,
            });
          } else {
            console.warn('[useAuthSession] No profile found for user', session.user.id);
            setUser({
              id: session.user.id,
              email: session.user.email ?? '',
              username: null,
              level: 1,
              xp_current: 0,
              xp_total: 0,
              wild_slots: 0,
            });
          }
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

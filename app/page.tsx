'use client';

import { useUserStore } from '@/store/useUserStore';
import { useXPStore } from '@/store/useXPStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { xpForLevel } from '@/lib/xp';
import { XPBar } from '@/components/XPBar';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';


export default function Dashboard() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);

  const xp = useXPStore((state) => state.xp);       // current XP inside level
  const level = useXPStore((state) => state.level); // current level
  const setXP = useXPStore((state) => state.setXP);

  const router = useRouter();

  // Fetch XP & level from DB when user logs in
  useEffect(() => {
    const fetchXP = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('xp_current, level')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        // use xp_current directly from DB
        setXP(data.xp_current, data.level);
      }
    };

    fetchXP();
  }, [user, setXP]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/auth/signin');
  };

  const xpTarget = xpForLevel(level);
  const progressPercent = Math.min((xp / xpTarget) * 100, 100);

  
  // if no user, show login link
  if (!user) {
    return (
      <PageWrapper>
        <h1 className="text-2xl font-bold mb-4">Welcome to the Dashboard</h1>
        <Link href="/auth/signin" className="text-blue-500 underline">
          Please sign in
        </Link>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      {/* XP Bar */}
      <XPBar
        level={level}
        xpCurrent={xp}
        xpNeeded={xpForLevel(level)}
      />

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center">
        <Link href="/skate/challenges" className="px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow hover:bg-blue-700 transition">
          Go to Challenges
        </Link>
      </div>
    </PageWrapper>
  );

  
}

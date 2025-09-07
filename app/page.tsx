'use client';

import Link from 'next/link';
import { useUserStore } from '@/store/useUserStore';
import { useXPStore } from '@/store/useXPStore';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Dashboard() {
  const user = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const xp = useXPStore((state) => state.xp);
  const level = useXPStore((state) => state.level);
  const setXP = useXPStore((state) => state.setXP);
  const router = useRouter();

  // Fetch XP & level from DB when user logs in
  useEffect(() => {
    const fetchXP = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('users')
        .select('xp_total, level')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        // Convert total XP into XP in current level
        const xpInLevel = data.xp_total % (data.level * 100);
        setXP(xpInLevel, data.level);
      }
    };

    fetchXP();
  }, [user, setXP]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/auth/signin');
  };

  const progressPercent = Math.min((xp / (level * 100)) * 100, 100);

  return (
    <div className="p-4 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Progression Dashboard</h1>

      {/* XP / Level */}
      <div className="mb-6">
        <p>Level: {level}</p>
        <div className="w-full bg-gray-300 rounded-full h-4">
          <div
            className="bg-blue-500 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-sm mt-1">{xp} XP / {level * 100} XP</p>
      </div>

      {/* Auth Buttons */}
      <div className="flex gap-4">
        {!user ? (
          <>
            <Link
              href="/auth/signup"
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Sign Up
            </Link>
            <Link
              href="/auth/signin"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Sign In
            </Link>
          </>
        ) : (
          <>
            <p className="text-gray-700 self-center">{user.username}</p>
            <button
              onClick={handleSignOut}
              className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </div>
  );
}

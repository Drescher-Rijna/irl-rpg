'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';

type Challenge = {
  id: string;
  type: 'daily' | 'boss' | 'line' | 'combo';
  name: string;
  description: string;
  tier: number;
  difficulty: number;
  xp_reward: number;
  is_completed: boolean;
  date_assigned: string;
};

export function ChallengeList() {
  const user = useUserStore((state) => state.user);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch challenges (generate if needed)
  useEffect(() => {
    if (!user?.id) return;

    const fetchChallenges = async () => {
      setLoading(true);
      try {
        const res = await fetch('/api/challenges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id }),
        });
        const data = await res.json();
        if (res.ok) {
          setChallenges(data.challenges || []);
        } else {
          console.error('Error fetching challenges:', data.error);
        }
      } catch (err) {
        console.error('Challenge fetch failed:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
  }, [user]);

  if (loading) return <p>Loading challenges...</p>;
  if (!challenges.length) return <p>No active challenges. Come back tomorrow!</p>;

  return (
    <div className="space-y-4">
      {challenges.map((c) => (
        <div
          key={c.id}
          className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition"
        >
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold">{c.name}</h2>
            <span
              className={`text-xs px-2 py-1 rounded-full ${
                c.type === 'daily'
                  ? 'bg-blue-100 text-blue-800'
                  : c.type === 'boss'
                  ? 'bg-red-100 text-red-800'
                  : c.type === 'line'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-purple-100 text-purple-800'
              }`}
            >
              {c.type.toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{c.description}</p>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Tier {c.tier}</span>
            <span>Difficulty {c.difficulty}</span>
            <span>XP: {c.xp_reward}</span>
          </div>
          {c.is_completed && (
            <p className="mt-2 text-green-600 font-medium">✓ Completed</p>
          )}
        </div>
      ))}
    </div>
  );
}

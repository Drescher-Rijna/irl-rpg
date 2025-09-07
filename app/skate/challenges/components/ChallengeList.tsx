'use client';
import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { useXPStore } from '@/store/useXPStore';
import { supabase } from '@/lib/supabase';
import { fetchAllTricks } from '@/lib/tricks';

type Challenge = {
  id: string;
  name: string;
  type: string;
  tier: number;
  xp_reward: number;
  is_completed: boolean;
};

interface Props {}

export const ChallengeList: React.FC<Props> = () => {
  const user = useUserStore((state) => state.user);
  const addXP = useXPStore((state) => state.addXP);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);
  const [tricks, setTricks] = useState<Trick[]>([]);

  useEffect(() => {
    console.log('Fetching tricks...');
    const loadTricks = async () => {
      const allTricks = await fetchAllTricks();
      setTricks(allTricks);
    };
    loadTricks();
  }, []);
  console.log('Tricks:', tricks);

  const fetchChallenges = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('challenges')
      .select('*')
      .eq('category_id', 'fb2a123c-d3de-4bfb-a767-019f3585b131')
      .order('date_assigned', { ascending: true });

    if (error) console.error(error);
    else setChallenges(data as Challenge[]);
  };

  const handleGenerateDaily = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await fetch('/api/challenges/generateDaily', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          tricks: tricks, // populate with your tricks array
          completedTrickIds: [],
          skateCategoryId: 'fb2a123c-d3de-4bfb-a767-019f3585b131',
        }),
      });
      const data = await res.json();
      console.log('Daily Challenges:', data.dailyChallenges);
      fetchChallenges();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteChallenge = async (challengeId: string) => {
    if (!user) return;
    try {
      const res = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, challengeId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      addXP(data.earnedXP);
      fetchChallenges();
    } catch (err: any) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Challenges</h2>
      <button
        onClick={handleGenerateDaily}
        className="bg-blue-500 text-white px-4 py-2 rounded mb-4 hover:bg-blue-600"
        disabled={loading}
      >
        {loading ? 'Generating...' : 'Generate Daily Challenges'}
      </button>

      {challenges.length === 0 && <p>No challenges yet.</p>}

      <ul className="space-y-2">
        {challenges.map((c) => (
          <li key={c.id} className="border p-2 rounded flex justify-between items-center">
            <div>
              <p className="font-semibold">{c.name}</p>
              <p className="text-sm">Tier: {c.tier} | XP: {c.xp_reward}</p>
              <p className="text-sm">Type: {c.type}</p>
            </div>
            <button
              onClick={() => handleCompleteChallenge(c.id)}
              disabled={c.is_completed}
              className={`px-3 py-1 rounded ${
                c.is_completed ? 'bg-gray-400' : 'bg-green-500 text-white hover:bg-green-600'
              }`}
            >
              {c.is_completed ? 'Completed' : 'Complete'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

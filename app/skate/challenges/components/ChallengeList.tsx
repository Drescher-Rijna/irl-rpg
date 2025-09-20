'use client';

import { useEffect, useState } from 'react';
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
  const MAX_DAILY = 5;
  const MAX_LINE = 2;
  const MAX_COMBO = 2;
  const MAX_BOSS = 1;

  const user = useUserStore((state) => state.user);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchChallenges = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setChallenges(data.challenges || []);
    } catch (err) {
      console.error('Challenge fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [user]);

  const handleComplete = async (challengeId: string) => {
    try {
      const res = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, challengeId }),
      });
      const data = await res.json();
      if (res.ok) {
        setChallenges(prev =>
          prev.map(c => c.id === challengeId ? { ...c, is_completed: true } : c)
        );
        console.log('XP earned:', data.earnedXP);
      } else {
        console.error('Complete failed:', data.error);
      }
    } catch (err) {
      console.error('Complete request failed:', err);
    }
  };

  const handleDelete = async (challengeId: string) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, { method: 'DELETE' });
      if (res.ok) {
        setChallenges(prev => prev.filter(c => c.id !== challengeId));
      }
    } catch (err) {
      console.error('Delete request failed:', err);
    }
  };

  // Separate active and completed
  const activeChallenges = challenges.filter(c => !c.is_completed);
  const completedChallenges = challenges.filter(c => c.is_completed);

  const canGenerateMore =
    activeChallenges.filter(c => c.type === 'daily').length < MAX_DAILY ||
    activeChallenges.filter(c => c.type === 'line').length < MAX_LINE ||
    activeChallenges.filter(c => c.type === 'combo').length < MAX_COMBO ||
    activeChallenges.filter(c => c.type === 'boss').length < MAX_BOSS;

  if (loading) return <p>Loading challenges...</p>;
  if (!challenges.length) return <p>No active challenges. Come back tomorrow!</p>;

  return (
    <div className="space-y-6">
      {/* Active Challenges */}
      <div>
        <h2 className="text-xl font-bold mb-2">Active Challenges</h2>
        <div className="space-y-4">
          {activeChallenges.map((c) => (
            <div key={c.id} className="border rounded-lg p-4 shadow-sm bg-white hover:shadow-md transition">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-lg font-semibold">{c.name}</h3>
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
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Tier {c.tier}</span>
                <span>Difficulty {c.difficulty}</span>
                <span>XP: {c.xp_reward}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleComplete(c.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Complete
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Challenges */}
      {completedChallenges.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Completed Challenges</h2>
          <div className="space-y-4">
            {completedChallenges.map((c) => (
              <div key={c.id} className="border rounded-lg p-4 shadow-sm bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold">{c.name}</h3>
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
                  <span className="text-green-600 font-medium">✓ Completed</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate More Button */}
      {canGenerateMore && (
        <div className="mt-4">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch('/api/challenges', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id }),
                });
                const data = await res.json();
                if (res.ok && data.challenges) {
                  setChallenges(prev => [...prev, ...data.challenges]);
                }
              } catch (err) {
                console.error('Failed to generate more challenges:', err);
              } finally {
                setLoading(false);
              }
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Generate More Challenges
          </button>
        </div>
      )}
    </div>
  );
}

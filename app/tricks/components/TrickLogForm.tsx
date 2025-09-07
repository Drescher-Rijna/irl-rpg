'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import { useXPStore } from '@/store/useXPStore';

type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
};

type Trick = {
  id: string;
  name: string;
  stance: string;
  obstacles: Obstacle[];
};

const TrickLogForm: React.FC = () => {
  const user = useUserStore((state) => state.user);
  const [tricks, setTricks] = useState<Trick[]>([]);
  const [selectedTrick, setSelectedTrick] = useState<string>('');
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [attempts, setAttempts] = useState<number>(1);
  const [landed, setLanded] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const addXP = useXPStore((state) => state.addXP);

  // Fetch all tricks with obstacles
  useEffect(() => {
    const fetchTricks = async () => {
      const { data, error } = await supabase
        .from('tricks')
        .select(`
          id,
          name,
          stance,
          trick_obstacles (
            obstacle_id,
            obstacles (id, name, type, difficulty)
          )
        `);
      if (error) console.error(error);
      else {
        const mapped: Trick[] = data.map((t: any) => ({
          id: t.id,
          name: t.name,
          stance: t.stance,
          obstacles: t.trick_obstacles.map((to: any) => to.obstacles)
        }));
        setTricks(mapped);
      }
    };
    fetchTricks();
  }, []);

  // Log trick API call
  const handleTrickLog = async (
    userId: string,
    trickId: string,
    obstacleIds: string[],
    obstacleScoresArray: number[],
    attempts: number,
    landed: number
  ) => {
    if (!userId || !trickId || obstacleIds.length === 0) return;

    const consistency =
      obstacleScoresArray.reduce((sum, score) => sum + score, 0) /
      obstacleScoresArray.length;

    try {
      const res = await fetch('/api/tricks/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          trickId,
          obstacleIds,
          obstacleScores: obstacleScoresArray,
          attempts,
          landed,
          consistency
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log trick');

      console.log('API Response:', data);
      addXP(data.earnedXP);
    } catch (err: any) {
      console.error(err.message);
    }
  };


  const handleTrickChange = (trickId: string) => {
    setSelectedTrick(trickId);
    const trick = tricks.find(t => t.id === trickId);
    setSelectedObstacles(trick ? trick.obstacles.map(o => o.id) : []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !selectedTrick || selectedObstacles.length === 0) {
      setMessage('Select a trick and at least one obstacle.');
      return;
    }

    if (landed > attempts) {
      setMessage('Landed cannot be greater than attempts.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Calculate score per obstacle (0–10 scale)
      const obstacleScoresArray = selectedObstacles.map(
        () => Math.round((landed / attempts) * 10)
      );

      // Call API to log trick, update tier, and XP
      await handleTrickLog(user.id, selectedTrick, selectedObstacles, obstacleScoresArray, attempts, landed);

      setMessage('Session logged successfully!');
      setAttempts(1);
      setLanded(0);
      setSelectedObstacles([]);
      setSelectedTrick('');
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-md">
      <h2 className="text-lg font-semibold">Log Trick Session</h2>

      <div>
        <label className="block mb-1 font-medium">Select Trick</label>
        <select
          value={selectedTrick}
          onChange={e => handleTrickChange(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="">-- Select Trick --</option>
          {tricks.map(t => (
            <option key={t.id} value={t.id}>
              {t.name} ({t.stance})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Obstacles</label>
        <div className="flex flex-wrap gap-2">
          {tricks
            .find(t => t.id === selectedTrick)
            ?.obstacles.map(o => (
              <label key={o.id} className="flex items-center gap-1 border rounded p-1 px-2">
                <input
                  type="checkbox"
                  checked={selectedObstacles.includes(o.id)}
                  onChange={() =>
                    setSelectedObstacles(prev =>
                      prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id]
                    )
                  }
                />
                {o.name} ({o.type}, diff {o.difficulty})
              </label>
            ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div>
          <label className="block mb-1 font-medium">Attempts</label>
          <input
            type="number"
            min={1}
            value={attempts}
            onChange={e => setAttempts(Number(e.target.value))}
            className="w-20 border rounded p-1"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Landed</label>
          <input
            type="number"
            min={0}
            max={attempts}
            value={landed}
            onChange={e => setLanded(Number(e.target.value))}
            className="w-20 border rounded p-1"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        {loading ? 'Logging...' : 'Log Session'}
      </button>

      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
    </form>
  );
};

export default TrickLogForm;

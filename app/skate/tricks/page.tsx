'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import TrickForm from './components/TrickForm';

type Trick = {
  id: string;
  name: string;
  stance: string;
  tier: number;
  obstacles: { id: string; name: string; type: string; difficulty: number }[];
};

const TricksPage: React.FC = () => {
  const [tricks, setTricks] = useState<Trick[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTricks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tricks')
        .select(`
          id,
          name,
          stance,
          tier,
          trick_obstacles (
            obstacle_id,
            obstacles (id, name, type, difficulty)
          )
        `);

      if (error) throw error;

      // Map tricks with obstacles array
      const mapped: Trick[] = data.map((t: any) => ({
        id: t.id,
        name: t.name,
        stance: t.stance,
        tier: t.tier,
        obstacles: t.trick_obstacles.map((to: any) => to.obstacles)
      }));

      setTricks(mapped);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTricks();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Tricks</h1>

      {/* Trick Form */}
      <div className="mb-6">
        <TrickForm onSuccess={fetchTricks} />
      </div>

      {/* Tricks List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Tricks</h2>
        {loading ? (
          <p>Loading tricks...</p>
        ) : (
          <ul className="space-y-2">
            {tricks.map(trick => (
              <li key={trick.id} className="border rounded p-2 shadow-sm">
                <p className="font-medium">{trick.name} ({trick.stance}) - Tier {trick.tier}</p>
                <p className="text-sm text-gray-600">
                  Obstacles: {trick.obstacles.map(o => `${o.name} (${o.type}, diff ${o.difficulty})`).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default TricksPage;

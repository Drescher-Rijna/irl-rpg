'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ObstacleForm from './components/ObstacleForm';

type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
};

const ObstaclesPage: React.FC = () => {
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchObstacles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('obstacles')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setObstacles(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchObstacles();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Obstacles</h1>

      {/* Obstacle Form */}
      <div className="mb-6">
        <ObstacleForm onSuccess={fetchObstacles} />
      </div>

      {/* Obstacles List */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Existing Obstacles</h2>
        {loading ? (
          <p>Loading obstacles...</p>
        ) : obstacles.length === 0 ? (
          <p>No obstacles yet.</p>
        ) : (
          <ul className="space-y-2">
            {obstacles.map(obs => (
              <li key={obs.id} className="border rounded p-2 shadow-sm">
                <p className="font-medium">{obs.name}</p>
                <p className="text-sm text-gray-600">Type: {obs.type}, Difficulty: {obs.difficulty}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ObstaclesPage;

'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
};

type TrickFormProps = {
  onSuccess?: () => void;
};

const TrickForm: React.FC<TrickFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [stance, setStance] = useState<'regular' | 'switch' | 'nollie' | 'fakie'>('regular');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [initialConsistency, setInitialConsistency] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch obstacles from Supabase
  useEffect(() => {
    const fetchObstacles = async () => {
      const { data, error } = await supabase.from('obstacles').select('*');
      if (error) {
        console.error(error);
      } else {
        setObstacles(data);
      }
    };
    fetchObstacles();
  }, []);

  const handleCheckboxChange = (id: string) => {
    setSelectedObstacles(prev =>
      prev.includes(id) ? prev.filter(o => o !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || selectedObstacles.length === 0) {
      setMessage('Please fill in the name and select at least one obstacle.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Insert trick
      const { data: trick, error: trickError } = await supabase
        .from('tricks')
        .insert([{ name, stance, category_id: 'YOUR_SKATEBOARD_CATEGORY_ID' }])
        .select()
        .single();

      if (trickError) throw trickError;

      const trickId = trick.id;

      // Insert trick-obstacle relationships
      const obstacleInserts = selectedObstacles.map(obstacleId => ({
        trick_id: trickId,
        obstacle_id: obstacleId
      }));
      const { error: obstacleError } = await supabase
        .from('trick_obstacles')
        .insert(obstacleInserts);
      if (obstacleError) throw obstacleError;

      // Insert initial consistency if > 0
      if (initialConsistency > 0) {
        const consistencyInserts = selectedObstacles.map(obstacleId => ({
          trick_id: trickId,
          obstacle_id: obstacleId,
          score: initialConsistency
        }));
        const { error: consistencyError } = await supabase
          .from('trick_consistency')
          .insert(consistencyInserts);
        if (consistencyError) throw consistencyError;
      }

      setMessage('Trick added successfully!');
      setName('');
      setSelectedObstacles([]);
      setInitialConsistency(0);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-md">
      <h2 className="text-lg font-semibold">Add New Trick</h2>

      <div>
        <label className="block mb-1 font-medium">Trick Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Stance</label>
        <select
          value={stance}
          onChange={e => setStance(e.target.value as any)}
          className="w-full border rounded p-2"
        >
          <option value="regular">Regular</option>
          <option value="switch">Switch</option>
          <option value="nollie">Nollie</option>
          <option value="fakie">Fakie</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Obstacles</label>
        <div className="flex flex-wrap gap-2">
          {obstacles.map(obstacle => (
            <label key={obstacle.id} className="flex items-center gap-1 border rounded p-1 px-2">
              <input
                type="checkbox"
                checked={selectedObstacles.includes(obstacle.id)}
                onChange={() => handleCheckboxChange(obstacle.id)}
              />
              {obstacle.name} ({obstacle.type}, diff {obstacle.difficulty})
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block mb-1 font-medium">Initial Consistency (0–10)</label>
        <input
          type="number"
          min={0}
          max={10}
          value={initialConsistency}
          onChange={e => setInitialConsistency(Number(e.target.value))}
          className="w-20 border rounded p-1"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Adding...' : 'Add Trick'}
      </button>

      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
    </form>
  );
};

export default TrickForm;

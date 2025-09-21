'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
};

type TrickCreationModalProps = {
  defaultName: string;
  onClose: () => void;
  onSuccess?: () => void;
};

export default function TrickCreationModal({ defaultName, onClose, onSuccess }: TrickCreationModalProps) {
  const [name, setName] = useState(defaultName);
  const [stance, setStance] = useState<'regular' | 'switch' | 'nollie' | 'fakie'>('regular');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [selectedObstacle, setSelectedObstacle] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchObstacles = async () => {
      const { data, error } = await supabase.from('obstacles').select('*');
      if (!error) setObstacles(data);
    };
    fetchObstacles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !selectedObstacle) {
      setMessage('Please set trick name and pick at least one obstacle.');
      return;
    }

    setLoading(true);
    try {
      // Insert trick
      const { data: trick, error: trickError } = await supabase
        .from('tricks')
        .insert([{ name, stance, category_id: 'fb2a123c-d3de-4bfb-a767-019f3585b131' }])
        .select('id')
        .single();
      if (trickError) throw trickError;

      // Insert trick-obstacle relation
      await supabase.from('trick_obstacles').insert([{ trick_id: trick.id, obstacle_id: selectedObstacle }]);

      // Insert trick_consistency with landed = true
      await supabase.from('trick_consistency').insert([{
        trick_id: trick.id,
        obstacle_id: selectedObstacle,
        landed: true,
        score: 0
      }]);

      // Create initial assessment challenge
      await supabase.from('challenges').insert([{
        trick_id: trick.id,
        obstacle_id: selectedObstacle,
        name: `Initial Assessment: ${name}`,
        description: `Land ${name} on this obstacle as many times as you can out of 10 attempts`,
        type: 'initial',
        tier: 3,
        difficulty: 1,
        xp_reward: 50,
        unlock_condition: { type: 'attempts', attempts: 10, lands: null }
      }]);

      setMessage('New combo trick created! Initial assessment added.');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-lg space-y-4 w-96">
        <h2 className="text-xl font-bold">Create Combo Trick</h2>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded p-2"
        />

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

        <div>
          <p className="font-medium mb-1">Select Landed Obstacle</p>
          {obstacles.map(o => (
            <label key={o.id} className="flex items-center gap-2 border p-2 rounded">
              <input
                type="radio"
                checked={selectedObstacle === o.id}
                onChange={() => setSelectedObstacle(o.id)}
              />
              {o.name} (diff {o.difficulty})
            </label>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Saving...' : 'Save Trick'}
          </button>
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}

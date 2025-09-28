'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserStore } from '@/store/useUserStore';
import Select from "react-select";

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
  const user = useUserStore((state) => state.user);
  const [name, setName] = useState('');
  const [stance, setStance] = useState<'regular' | 'switch' | 'nollie' | 'fakie'>('regular');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [selectedObstacles, setSelectedObstacles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch obstacles from Supabase
  useEffect(() => {
    const fetchObstacles = async () => {
      const { data, error } = await supabase.from('obstacles').select('*');
      console.log(data, error);
      if (error) {
        console.error(error);
      } else {
        setObstacles(data);
      }
    };
    fetchObstacles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage('You must be logged in to add a trick.');
      return;
    }

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
        .insert([
          { name, 
            stance, 
            user_id: user.id,
            category_id: 'fb2a123c-d3de-4bfb-a767-019f3585b131' 
          }
        ])
        .select('id, name, stance, category_id')
        .single();

      if (trickError) throw trickError;

      const trickId = trick.id;

      // Insert trick-obstacle relationships
      const obstacleInserts = selectedObstacles.map(obstacleId => ({
        user_id: user.id,
        trick_id: trickId,
        obstacle_id: obstacleId
      }));
      const { error: obstacleError } = await supabase
        .from('trick_obstacles')
        .insert(obstacleInserts);
      if (obstacleError) throw obstacleError;

      const consistencyInserts = selectedObstacles.map(obstacleId => ({
        user_id: user.id,
        trick_id: trickId,
        obstacle_id: obstacleId,
      }));
      const { error: consistencyError } = await supabase
        .from('trick_consistency')
        .insert(consistencyInserts);
      if (consistencyError) throw consistencyError;
      

      setMessage('Trick added successfully!');
      setName('');
      setSelectedObstacles([]);
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
  <Select
    isMulti
    options={obstacles.map((o) => ({
      value: o.id,
      label: `${o.name} (${o.type}, diff ${o.difficulty})`,
    }))}
    value={obstacles
      .filter((o) => selectedObstacles.includes(o.id))
      .map((o) => ({
        value: o.id,
        label: `${o.name} (${o.type}, diff ${o.difficulty})`,
      }))}
    onChange={(selected) => {
      setSelectedObstacles(selected.map((s) => s.value));
    }}
    className="w-full"
    placeholder="Search and select obstacles..."
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

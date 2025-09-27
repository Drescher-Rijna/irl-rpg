'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

const ObstacleForm: React.FC<{ onSuccess?: () => void }> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('ledge');
  const [difficulty, setDifficulty] = useState(1);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.from('obstacles').insert([{ name, type, difficulty }]);
      if (error) throw error;
      setName('');
      setType('ledge');
      setDifficulty(1);
      setMessage('Obstacle created!');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage(err.message || 'Error creating obstacle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded shadow-md">
      <h2 className="text-lg font-semibold">Add Obstacle</h2>

      <div>
        <label className="block mb-1 font-medium">Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">Type</label>
        <select
          value={type}
          onChange={e => setType(e.target.value)}
          className="w-full border rounded p-2"
        >
          <option value="bank">Bank</option>
            <option value="flat">Flat</option>
            <option value="gap">Gap</option>
          <option value="ledge">Ledge</option>
            <option value="manual-pad">Manual Pad</option>
          <option value="rail">Rail</option>
           <option value="stair">Stair</option>
          <option value="transition">Transition</option>
        </select>
      </div>

      <div>
        <label className="block mb-1 font-medium">Difficulty (1–10)</label>
        <input
          type="number"
          min={1}
          max={10}
          value={difficulty}
          onChange={e => setDifficulty(Number(e.target.value))}
          className="w-20 border rounded p-1"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        {loading ? 'Adding...' : 'Add Obstacle'}
      </button>

      {message && <p className="mt-2 text-sm text-green-600">{message}</p>}
    </form>
  );
};

export default ObstacleForm;

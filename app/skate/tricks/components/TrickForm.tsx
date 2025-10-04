// TrickForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import Select from "react-select";
import { fetchAllObstacleTypes } from '@/lib/obstacle';

export default function TrickForm({ onSuccess }: { onSuccess?: () => void }) {
  const user = useUserStore((state) => state.user);
  const [name, setName] = useState('');
  const [stance, setStance] = useState<'regular' | 'switch' | 'nollie' | 'fakie'>('regular');
  const [obstacleTypes, setObstacleTypes] = useState<string[]>([]);
  const [obstacleTypeOptions, setObstacleTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch obstacle types on component mount
  useEffect(() => {
    const loadObstacleTypes = async () => {
      const types = await fetchAllObstacleTypes();
      const options = types.map(t => ({ value: t.id, label: t.name }));
      setObstacleTypeOptions(options);
    };
    loadObstacleTypes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage('You must be logged in to add a trick.');
      return;
    }

    if (!name || obstacleTypes.length === 0) {
      setMessage('Please enter a name and select at least one obstacle type.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/tricks/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          stance,
          userId: user.id,
          obstacle_type_ids: obstacleTypes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessage('Trick added successfully!');
      setName('');
      setObstacleTypes([]);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-lg shadow-md">
      <h2 className="text-lg font-semibold">Add New Trick</h2>

      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Trick name"
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

      <Select
        isMulti
        options={obstacleTypeOptions}
        value={obstacleTypeOptions.filter(option => obstacleTypes.includes(option.value))}
        onChange={(selected) => setObstacleTypes(selected.map(s => s.value))}
        className="w-full"
        placeholder="Select obstacle types..."
      />

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
}

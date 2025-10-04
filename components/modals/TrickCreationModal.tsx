'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import { fetchAllObstacleTypes } from '@/lib/obstacle';
import Select from "react-select";

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
  const user = useUserStore((state) => state.user);

   const [obstacleTypeOptions, setObstacleTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [name, setName] = useState(defaultName);
  const [stance, setStance] = useState<'regular' | 'switch' | 'nollie' | 'fakie'>('regular');
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [obstacleTypes, setObstacleTypes] = useState<string[]>([]);
  const [landedType, setLandedType] = useState<string | null>(null);
  const [landedObstacleId, setLandedObstacleId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch all obstacles from Supabase
  useEffect(() => {
    const fetchObstacles = async () => {
      const res = await fetch('/api/obstacles'); // assumes you expose obstacles in API
      const data = await res.json();
      if (res.ok) setObstacles(data);
    };
    fetchObstacles();

    // Fetch obstacle types for select options
     const loadObstacleTypes = async () => {
        const types = await fetchAllObstacleTypes();
        const options = types.map(t => ({ value: t.id, label: t.name }));
        setObstacleTypeOptions(options);
      };
      loadObstacleTypes();
  }, []);

  // Filtered obstacles based on landed type
  const filteredObstacles = landedType
    ? obstacles.filter((o) => o.type === landedType)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setMessage('You must be logged in.');
      return;
    }
    if (!name || obstacleTypes.length === 0 || !landedType || !landedObstacleId) {
      setMessage('Please fill all fields.');
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
          landed_type: landedType,
          landedObstacleId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

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

        {/* Trick Name */}
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Trick name"
          className="w-full border rounded p-2"
        />

        {/* Stance */}
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

        {/* Obstacle Types (multi) */}
        <div>
          <p className="font-medium mb-1">Select Obstacle Types</p>
          <Select
            isMulti
            options={obstacleTypeOptions}
            value={obstacleTypeOptions.filter(o => obstacleTypes.includes(o.value))}
            onChange={(selected) => setObstacleTypes(selected.map(s => s.value))}
            className="w-full"
            placeholder="Choose obstacle types..."
          />
        </div>

        {/* Landed Type */}
        <div>
          <p className="font-medium mb-1">Select Landed Type</p>
          <select
            value={landedType || ''}
            onChange={e => setLandedType(e.target.value)}
            disabled={obstacleTypes.length === 0}
            className="w-full border rounded p-2"
          >
            <option value="" disabled>Select landed type</option>
            {obstacleTypes.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Landed Obstacle */}
        <div>
          <p className="font-medium mb-1">Select Landed Obstacle</p>
          <select
            value={landedObstacleId || ''}
            onChange={e => setLandedObstacleId(e.target.value)}
            disabled={!landedType}
            className="w-full border rounded p-2"
          >
            <option value="" disabled>Select obstacle</option>
            {filteredObstacles.map(o => (
              <option key={o.id} value={o.id}>
                {o.name} (diff {o.difficulty})
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Saving...' : 'Save Trick'}
          </button>
        </div>

        {message && <p className="text-sm text-green-600">{message}</p>}
      </form>
    </div>
  );
}

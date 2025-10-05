'use client';

import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import Select from "react-select";

type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
};

type TrickCreationModalProps = {
  challengeId: string;
  type: string; // 'combo'
  onClose: () => void;
  onSuccess?: () => void;
};

export default function TrickCreationModal({ challengeId, type, onClose, onSuccess }: TrickCreationModalProps) {
  const user = useUserStore((state) => state.user);

  const [name, setName] = useState('');
  const [stance, setStance] = useState<'regular' | 'switch' | 'nollie' | 'fakie'>('regular');
  const [obstacleTypeOptions, setObstacleTypeOptions] = useState<{ value: string; label: string }[]>([]);
  const [obstacleTypes, setObstacleTypes] = useState<string[]>([]);
  const [landedType, setLandedType] = useState<string | null>(null);
  const [landedObstacleId, setLandedObstacleId] = useState<string | null>(null);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Fetch obstacles and types
  useEffect(() => {
    const fetchObstacles = async () => {
      const res = await fetch('/api/obstacles');
      const data = await res.json();
      if (res.ok) setObstacles(data);
    };
    fetchObstacles();

    const fetchTypes = async () => {
      const res = await fetch('/api/obstacle_types');
      const data = await res.json();
      if (res.ok) setObstacleTypeOptions(data.map((t: any) => ({ value: t.id, label: t.name })));
    };
    fetchTypes();
  }, []);

  const filteredObstacles = landedType
    ? obstacles.filter(o => o.type === landedType)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !challengeId) return;
    if (!name || !stance || obstacleTypes.length === 0 || !landedType || !landedObstacleId) {
      setMessage('Please fill all fields.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      // Call complete route with trick data
      const res = await fetch('/api/challenges/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          challengeId,
          trickData: {
            name,
            stance,
            obstacleTypeIds: obstacleTypes,
            landedType,
            landedObstacleId
          }
        })
      });

      const data = await res.json();

      if (res.ok) {
        // XP modal data comes from complete route
        onSuccess?.();
        onClose();
      } else {
        console.error('Combo completion failed:', data.error);
        setMessage(data.error || 'Something went wrong.');
      }
    } catch (err) {
      console.error(err);
      setMessage('Something went wrong.');
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

        <div>
          <p className="font-medium mb-1">Select Landed Type</p>
          <select
            value={landedType || ''}
            onChange={e => setLandedType(e.target.value)}
            disabled={obstacleTypes.length === 0}
            className="w-full border rounded p-2"
          >
            <option value="" disabled>Select landed type</option>
            {obstacleTypes.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

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
              <option key={o.id} value={o.id}>{o.name} (diff {o.difficulty})</option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">Cancel</button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Saving...' : 'Save Trick'}
          </button>
        </div>

        {message && <p className="text-sm text-red-600">{message}</p>}
      </form>
    </div>
  );
}

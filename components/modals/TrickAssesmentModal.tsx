'use client';

import { useState } from 'react';

type Props = {
  trickName: string;
  obstacleName: string;
  attempts: number;
  onSubmit: (lands: number) => Promise<void>;
  onClose: () => void;
};

export default function TrickAssessmentModal({ trickName, obstacleName, attempts, onSubmit, onClose }: Props) {
  const [lands, setLands] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(lands);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-lg space-y-4">
        <h2 className="text-xl font-bold">Consistency Assessment</h2>
        <p>
          How many times did you land <strong>{trickName}</strong> on <strong>{obstacleName}</strong> 
          out of {attempts} attempts?
        </p>

        <input
          type="number"
          min={0}
          max={attempts}
          value={lands}
          onChange={e => setLands(Number(e.target.value))}
          className="border rounded p-2 w-20"
        />

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">
            {loading ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

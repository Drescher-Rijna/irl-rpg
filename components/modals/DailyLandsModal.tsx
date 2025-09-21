'use client';

import React, { useState } from 'react';

type DailyLandsData = {
  challengeId: string;
  trickId: string;
  obstacleId: string;
};

type Props = {
  data: DailyLandsData;
  onClose: () => void;
  onSubmit: (landsCompleted: number, attempts: number) => void;
};

const DailyLandsModal: React.FC<Props> = ({ data, onClose, onSubmit }) => {
  const [lands, setLands] = useState(0);
  const [attempts, setAttempts] = useState(10);

  const handleSubmit = () => {
    if (lands > attempts) return alert("Lands cannot exceed attempts");
    onSubmit(lands, attempts);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-lg">
        <h2 className="text-lg font-bold mb-4">Complete Challenge</h2>
        <p className="mb-4">Enter your results for this challenge:</p>
        <div className="flex flex-col gap-3 mb-4">
          <label>
            Attempts:
            <input
              type="number"
              min={1}
              max={100}
              value={attempts}
              onChange={(e) => setAttempts(Number(e.target.value))}
              className="border rounded px-2 py-1 w-full"
            />
          </label>
          <label>
            Lands:
            <input
              type="number"
              min={0}
              max={attempts}
              value={lands}
              onChange={(e) => setLands(Number(e.target.value))}
              className="border rounded px-2 py-1 w-full"
            />
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-gray-300 px-3 py-1 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
};

export default DailyLandsModal;

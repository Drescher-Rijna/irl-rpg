'use client';

import React from 'react';
import { Challenge } from '@/types';

type ChallengeItemProps = {
  challenge: Challenge;
  onComplete: (challenge: Challenge) => void;
  onDelete: (challengeId: string) => void;
};

const ChallengeItem: React.FC<ChallengeItemProps> = ({ challenge, onComplete, onDelete }) => {
  const typeStyles: Record<string, string> = {
    daily: 'bg-blue-100 text-blue-800',
    boss: 'bg-red-100 text-red-800',
    line: 'bg-green-100 text-green-800',
    combo: 'bg-purple-100 text-purple-800',
    initial: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div
      className={`border rounded-lg p-4 shadow-sm transition hover:shadow-md
        ${challenge.completed ? 'bg-gray-50' : 'bg-white'}
        ${challenge.failed ? 'border-red-500' : 'border-gray-300'}
      `}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-semibold">{challenge.name}</h3>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded-full ${typeStyles[challenge.type]}`}>
            {challenge.type.toUpperCase()}
          </span>
          {challenge.failed && <span className="text-xs px-2 py-1 rounded bg-red-200 text-red-800 font-semibold">Failed</span>}
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-2">{challenge.description}</p>

      <div className="flex justify-between text-sm text-gray-600 mb-2">
        <span>Difficulty {challenge.difficulty}</span>
        <span>XP: {challenge.xp_reward}</span>
      </div>

      <div className="flex gap-2">
        {!challenge.completed && !challenge.failed && (
          <button
            onClick={() => onComplete(challenge)}
            className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
          >
            Complete
          </button>
        )}
        {(!challenge.completed && (challenge.type === 'combo' || challenge.type === 'line')) && (
          <button
            onClick={() => onDelete(challenge.id)}
            className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default ChallengeItem;

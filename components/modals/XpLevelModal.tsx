'use client';

import React, { useEffect, useRef, useState } from 'react';
import { xpForLevel } from '@/lib/xp';

type XPModalData = {
  earnedXP: number;
  bonusXP?: number;
  projectedLevel: number; 
  wildSlotAwarded: boolean;
  currentLevel: number;  
  currentXP: number;     
};

type XPLevelModalProps = {
  data: XPModalData;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

const XPLevelModal: React.FC<XPLevelModalProps> = ({ data, onClose, onConfirm }) => {
  const [level, setLevel] = useState(data.currentLevel);
  const [xpInLevel, setXpInLevel] = useState(data.currentXP);
  const [xpTarget, setXpTarget] = useState(xpForLevel(data.currentLevel));


  // XP left to animate (earned + bonus)
  const xpRemainingRef = useRef(data.earnedXP + (data.bonusXP || 0));

  useEffect(() => {
    const animate = () => {
      const xpRemaining = xpRemainingRef.current;
      if (xpRemaining <= 0) return;

      const needed = xpTarget - xpInLevel;

      if (xpRemaining >= needed) {
        // Fill the bar to the end of this level
        setXpInLevel(xpTarget);
        xpRemainingRef.current -= needed;

        // After short delay, level up and reset bar
        setTimeout(() => {
          setLevel((prevLevel) => {
            const nextLevel = prevLevel + 1;
            setXpTarget(xpForLevel(nextLevel));
            setXpInLevel(0);
            return nextLevel;
          });
          // Continue animating into the next level
          setTimeout(animate, 600);
        }, 600);
      } else {
        // Fill partially within this level
        setXpInLevel((prev) => prev + xpRemaining);
        xpRemainingRef.current = 0;
      }
    };

    animate();
  }, [xpTarget, xpInLevel]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg w-80 text-center">
        <h2 className="text-xl font-bold mb-4">XP Gained!</h2>
        <p className="mb-2">
          Earned XP: {data.earnedXP}
          {data.bonusXP ? ` (+${data.bonusXP} bonus)` : ''}
        </p>

        <div className="w-full bg-gray-200 rounded h-4 mb-2">
          <div
            className="bg-blue-500 h-4 rounded transition-all duration-500"
            style={{ width: `${Math.min((xpInLevel / xpTarget) * 100, 100)}%` }}
          ></div>
        </div>
        <p className="mb-2">
          Level {level} — {xpInLevel} / {xpTarget} XP
        </p>

        {data.wildSlotAwarded && (
          <p className="text-yellow-600 font-semibold">
            🎉 You earned a Wild Slot!
          </p>
        )}

        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default XPLevelModal;

'use client';

import React, { useEffect, useState } from 'react';

type XPModalData = {
  earnedXP: number;
  bonusXP?: number;
  projectedXP: number;
  projectedLevel: number;
  wildSlotAwarded: boolean;
};

type XPLevelModalProps = {
  data: XPModalData;
  onClose: () => void;
  onConfirm: () => Promise<void>;
};

const XPLevelModal: React.FC<XPLevelModalProps> = ({ data, onClose, onConfirm }) => {
  const [xpBar, setXpBar] = useState(0);

  useEffect(() => {
    let animation: NodeJS.Timer;
    let progress = 0;
    const totalXP = data.earnedXP + (data.bonusXP || 0);

    animation = setInterval(() => {
      progress += 1;
      if (progress >= totalXP) {
        progress = totalXP;
        clearInterval(animation);
      }
      setXpBar(progress);
    }, 20);

    return () => clearInterval(animation);
  }, [data.earnedXP, data.bonusXP]);

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
            className="bg-blue-500 h-4 rounded transition-all"
            style={{ width: `${(xpBar / data.projectedXP) * 100}%` }}
          ></div>
        </div>
        <p className="mb-2">Projected Level: {data.projectedLevel}</p>
        {data.wildSlotAwarded && <p className="text-yellow-600 font-semibold">🎉 You earned a Wild Slot!</p>}
        <div className="flex justify-center gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400">
            Cancel
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

export default XPLevelModal;

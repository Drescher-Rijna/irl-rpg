import { create } from "zustand";

interface XPState {
  xp: number;
  level: number;
  addXP: (amount: number) => void;
}

export const useXPStore = create<XPState>((set) => ({
  xp: 0,
  level: 1,
  addXP: (amount) => set((state) => {
    const newXP = state.xp + amount;
    const levelUpThreshold = 100 * state.level;
    return {
      xp: newXP % levelUpThreshold,
      level: newXP >= levelUpThreshold ? state.level + 1 : state.level
    };
  }),
}));

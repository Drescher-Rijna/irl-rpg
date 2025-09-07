import { create } from "zustand";

interface XPState {
  xp: number;      // XP in current level
  level: number;   // current level
  addXP: (amount: number) => void;
}

export const useXPStore = create<XPState>((set) => ({
  xp: 0,
  level: 1,
  addXP: (amount) =>
    set((state) => {
      let xp = state.xp + amount;
      let level = state.level;

      while (xp >= level * 100) {
        xp -= level * 100;
        level += 1;
      }

      return { xp, level };
    }),
  setXP: (xp: number, level: number) => set({ xp, level }),
}));

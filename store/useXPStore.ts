// store/useXPStore.ts
import { create } from "zustand";

interface XPState {
  xp: number;      // XP in current level
  level: number;   // current level
  addXP: (amount: number) => void;
  setXP: (xp: number, level: number) => void;
}

export const useXPStore = create<XPState>((set) => ({
  xp: 0,
  level: 1,
  addXP: (amount: number) =>
    set((state) => {
      let xp = state.xp + amount;
      let level = state.level;

      // dynamic xp per level: same as xpForLevel in lib/xp
      const xpForLevel = (lvl: number) => 100 + (lvl - 1) * 50;

      while (xp >= xpForLevel(level)) {
        xp -= xpForLevel(level);
        level += 1;
      }

      return { xp, level };
    }),
  setXP: (xp: number, level: number) => set({ xp, level }),
}));

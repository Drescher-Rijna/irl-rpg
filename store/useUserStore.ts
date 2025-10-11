// store/useUserStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

// --- XP → Level Calculation ---
const xpForLevel = (level: number): number => 100 + (level - 1) * 50;

const calculateLevelFromXP = (xp: number): number => {
  let level = 1;
  let remainingXP = xp;

  while (remainingXP >= xpForLevel(level)) {
    remainingXP -= xpForLevel(level);
    level++;
  }

  return level;
};

type UserState = {
  user: User | null;
  setUser: (user: User | null) => void;
  clearUser: () => void;
  addXP: (amount: number) => void;
  getLevel: () => number;
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,

      // --- Set / Clear ---
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),

      // --- Add XP and auto-update level ---
      addXP: (amount: number) => {
        const current = get().user;
        if (!current) return;

        const newXP = (current.xp ?? 0) + amount;
        const newLevel = calculateLevelFromXP(newXP);

        set({
          user: {
            ...current,
            xp: newXP,
            level: newLevel,
          },
        });
      },

      // --- Get current level from XP ---
      getLevel: () => {
        const current = get().user;
        return current ? calculateLevelFromXP(current.xp ?? 0) : 1;
      },
    }),
    {
      name: "user-storage", // key for localStorage
      getStorage: () => localStorage,
    }
  )
);

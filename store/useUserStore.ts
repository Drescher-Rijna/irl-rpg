// store/useUserStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

type UserState = {
  user: User | null;
  setUser: (user: User | null) => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      clearUser: () => set({ user: null }),
    }),
    {
      name: "user-storage", // key in localStorage
      getStorage: () => localStorage, // explicitly use localStorage
    }
  )
);

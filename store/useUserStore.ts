import { create } from 'zustand';
import { User } from '@supabase/supabase-js';


interface UserProfile {
  id: string;
  email: string;
  username: string;
}

interface UserState {
  user: UserProfile | null;
  setUser: (user: UserProfile | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));

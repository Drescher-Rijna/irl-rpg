// lib/user.ts
import { supabase } from './supabase';
import type { User } from '@/types';

export async function getUserProfile(userId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id, email, username, xp_total, xp_current, level, wild_slots')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('getUserProfile error', error);
    throw error;
  }
  return data ?? null;
}

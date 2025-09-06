import { supabase } from './supabase';

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('username, email')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data; // { username: string, email: string }
}

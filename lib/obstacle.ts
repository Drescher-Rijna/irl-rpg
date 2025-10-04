// lib/obstacle.ts
import { supabase } from './supabase';

export async function fetchObstaclesForUser(userId: string) {
  const { data, error } = await supabase
    .from('obstacles')
    .select('id, name, difficulty, obstacle_type_id, user_id')
    .eq('user_id', userId);

  if (error) throw error;
  return data || [];
}

export async function fetchAllObstacleTypes() {
  const { data, error } = await supabase
    .from('obstacle_types')
    .select('id, name');
  if (error) throw error;
  return data || [];
}

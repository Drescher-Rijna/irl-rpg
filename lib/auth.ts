import { supabase } from '@/lib/supabase';

export async function signUp(email: string, password: string, username: string) {
  // 1️⃣ Sign up with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error('User creation failed');

  console.log('New user ID:', userId);

  // 2️⃣ Insert into your users table
  await supabase.from('users').insert([{
    id: userId,
    email,
    username,
    level: 1,
    xp_current: 0,
    xp_total: 0,
    wild_slots: 0,
  }]);

  console.log('Inserted user into users table');

  // 3️⃣ Seed default obstacles for this user
  await supabase.rpc('seed_obstacles_for_user', { p_user_id: userId });

  return data.user;
}

export async function signIn(email: string, password: string) {
 const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.user;
}

import { supabase } from '@/lib/supabase';

export async function signUp(email: string, password: string, username: string) {
  // 1️⃣ Create Auth user
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  const userId = data.user?.id;
  if (!userId) throw new Error("User creation failed");

  // 2️⃣ Insert into `users` table
  const { error: insertError } = await supabase.from("users").insert([
    {
      id: userId,
      email,
      username,
      level: 1,
      xp_current: 0,
      xp_total: 0,
      wild_slots: 0,
    },
  ]);
  if (insertError) throw insertError;

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

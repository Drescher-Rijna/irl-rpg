import { supabase } from '@/lib/supabase';

export async function signUp(email: string, password: string, username: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;

  if (data.user) {
    await supabase.from('users').insert([{
      id: data.user.id,
      email,
      username,
    }]);
  }

  return data.user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data.user;
}

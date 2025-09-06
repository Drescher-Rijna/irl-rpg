'use client';
import { useState } from 'react';
import { signUp } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { supabase } from '@/lib/supabase';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

 const handleSignup = async (e: React.FormEvent) => {
  e.preventDefault();
  try {
    const authUser = await signUp(email, password, username); // Supabase auth user
    if (authUser) {
      // Create profile object including username
      const profile = {
        id: authUser.id,
        email: authUser.email!,
        username: username, // collected from input
      };

      // Insert into global store
      setUser(profile);

      // Optionally, insert into users table in Supabase
      await supabase.from('users').insert([profile]);

      router.push('/'); // redirect to dashboard
    }
  } catch (err: any) {
    setMessage(err.message);
  }
};

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSignup} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded"
          required
        />
        <button type="submit" className="bg-green-500 text-white p-2 rounded">
          Sign Up
        </button>
      </form>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </div>
  );
}

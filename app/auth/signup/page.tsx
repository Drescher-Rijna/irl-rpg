'use client';
import { useState } from 'react';
import { signUp } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import PageWrapper from '@/components/ui/PageWrapper';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  const setUser = useUserStore((state) => state.setUser);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');

    try {
      const authUser = await signUp(email, password, username); // signUp now handles users table & obstacles

      if (!authUser) {
        setMessage('Signup failed. Please try again.');
        return;
      }

      // Update global store
      setUser({
        id: authUser.id,
        email: authUser.email!,
        username,
        level: 1,
        xp_current: 0,
        xp_total: 0,
        wild_slots: 0,
      });

      // Redirect to dashboard
      router.replace('/');
    } catch (err: any) {
      console.error('Signup error:', err);
      setMessage(err.message || 'An unexpected error occurred.');
    }
  };

  return (
    <PageWrapper>
      <h1 className="text-xl font-bold mb-4">Sign Up</h1>
      <form onSubmit={handleSignup} className="flex flex-col gap-2">
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="border p-2 rounded text-black"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border p-2 rounded text-black"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border p-2 rounded text-black"
          required
        />
        <button type="submit" className="bg-green-500 text-white p-2 rounded">
          Sign Up
        </button>
      </form>
      {message && <p className="mt-2 text-red-500">{message}</p>}
    </PageWrapper>
  );
}

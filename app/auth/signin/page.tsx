'use client';
import { useState, useEffect } from 'react';
import { signIn } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { getUserProfile } from '@/lib/user';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();
    const setUser = useUserStore((state) => state.setUser);
    const user = useUserStore((state) => state.user);

    useEffect(() => {
        if (user) {
            router.push('/'); // redirect to dashboard
        }
    }, [user, router]);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const authUser = await signIn(email, password);
            if (authUser) {
            // fetch username from your users table
            const profile = await getUserProfile(authUser.id);

            // update global user store
            setUser({
                id: authUser.id,
                email: profile.email,
                username: profile.username,
            });

            router.push('/'); // redirect to dashboard
            }
        } catch (err: any) {
            setMessage(err.message);
        }
    };

    return (
        <div className="p-4 max-w-md mx-auto">
        <h1 className="text-xl font-bold mb-4">Sign In</h1>
        <form onSubmit={handleSignIn} className="flex flex-col gap-2">
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
            <button type="submit" className="bg-blue-500 text-white p-2 rounded">
            Sign In
            </button>
        </form>
        {message && <p className="mt-2 text-red-500">{message}</p>}
        </div>
    );
}

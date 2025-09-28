'use client';
import { useState } from 'react';
import { signIn } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/store/useUserStore';
import { getUserProfile } from '@/lib/user';
import PageWrapper from '@/components/ui/PageWrapper';

export default function SignInPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const router = useRouter();
    const setUser = useUserStore((state) => state.setUser);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(''); // clear previous errors
        try {
            // 1️⃣ Sign in with Supabase
            const authUser = await signIn(email, password);
            console.log('signIn response:', authUser);

            if (!authUser) {
                setMessage('Failed to sign in.');
                return;
            }

            // 2️⃣ Fetch user profile
            const profile = await getUserProfile(authUser.id);
            if (!profile) {
                setMessage('Could not fetch user profile.');
                return;
            }

            // 3️⃣ Update global store
            setUser({
                id: authUser.id,
                email: profile.email,
                username: profile.username,
                level: profile.level,
                xp_current: profile.xp_current,
                xp_total: profile.xp_total,
                wild_slots: profile.wild_slots,
            });

            // 4️⃣ Redirect immediately
            router.push('/');
        } catch (err: any) {
            console.error('[SignIn] Error:', err);
            setMessage(err.message || 'An unexpected error occurred.');
        }
    };


    return (
        <PageWrapper>
            <h1 className="text-xl font-bold mb-4 text-black">Sign In</h1>
            <form onSubmit={handleSignIn} className="flex flex-col gap-2">
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
                <button type="submit" className="bg-blue-500 text-white p-2 rounded">
                Sign In
                </button>
            </form>
            {message && <p className="mt-2 text-red-500">{message}</p>}
        </PageWrapper>
    );
}

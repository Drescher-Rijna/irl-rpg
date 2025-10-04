"use client"
import { useState, useEffect } from 'react';
import { useUserStore } from '@/store/useUserStore';
import Link from 'next/link';
import PageWrapper from '@/components/ui/PageWrapper';
import { fetchAllTricks } from '@/lib/tricks';
import { canGenerateChallenges } from '@/lib/challenges';
import type { Trick } from '@/types';

export default function Dashboard() {
  const user = useUserStore((state) => state.user);
  const [tricks, setTricks] = useState<Trick[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadTricks = async () => {
      setLoading(true);
      const userTricks = await fetchAllTricks(user.id);
      setTricks(userTricks);
      setLoading(false);
    };

    loadTricks();
  }, [user]);

  // if no user, show login link
  if (!user) {
    return (
      <PageWrapper>
        <h1 className="text-2xl font-bold mb-4 text-black text-center">
          Welcome to the Dashboard
        </h1>
        <Link href="/auth/signin" className="text-blue-500 underline text-center">
          Please sign in
        </Link>
      </PageWrapper>
    );
  }

  const hasEnoughTricks = canGenerateChallenges(tricks);

  return (
    <PageWrapper>
      <div className="flex-1 flex flex-col items-center justify-center space-y-4">
        <Link
          href={hasEnoughTricks ? "/skate/challenges" : "#"}
          className={`px-8 py-4 text-lg font-semibold text-white rounded-lg shadow transition ${
            hasEnoughTricks
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-400 cursor-not-allowed"
          }`}
          onClick={(e) => {
            if (!hasEnoughTricks) e.preventDefault();
          }}
        >
          Go to Challenges
        </Link>

        {!hasEnoughTricks && (
          <p className="text-center text-gray-700">
            You need at least 5 tricks to generate challenges.{" "}
            <Link href="/skate/tricks" className="text-blue-500 underline">
              Add more tricks here
            </Link>
          </p>
        )}

        {loading && <p>Loading your tricks...</p>}
      </div>
    </PageWrapper>
  );
}

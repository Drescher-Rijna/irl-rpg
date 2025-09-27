'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/useUserStore';
import ChallengeItem from './ChallengeItem';
import XPLevelModal from '@/components/modals/XpLevelModal';
import TrickCreationModal from '@/components/modals/TrickCreationModal';
import DailyLandsModal from '@/components/modals/DailyLandsModal';

type Challenge = {
  id: string;
  type: 'daily' | 'boss' | 'line' | 'combo' | 'initial';
  name: string;
  description: string;
  tier: number;
  difficulty: number;
  xp_reward: number;
  is_completed: boolean;
  failed?: boolean;
  trick_id?: string;
  obstacle_id?: string;
};

export function ChallengeList() {
  const MAX_DAILY = 5;
  const MAX_LINE = 2;
  const MAX_COMBO = 2;
  const MAX_BOSS = 1;

  const user = useUserStore((state) => state.user);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(false);

  const [xpModalData, setXPModalData] = useState<null | {
    earnedXP: number;
    bonusXP?: number;
    projectedXP: number;
    projectedLevel: number;
    wildSlotAwarded: boolean;
    currentLevel: number;
    currentXP: number;
  }>(null);

  const [trickModalData, setTrickModalData] = useState<null | {
    challengeId: string;
    challengeType: string;
  }>(null);

  const [dailyLandsData, setDailyLandsData] = useState<null | {
    challengeId: string;
    trickId: string;
    obstacleId: string;
  }>(null);

  // Fetch challenges
  const fetchChallenges = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges?userId=${user.id}`);
      const data = await res.json();
      if (res.ok) setChallenges(data.challenges || []);
    } catch (err) {
      console.error('Challenge fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchChallenges(); }, [user]);

  // Complete daily/initial with lands
  const handleCompleteWithLands = async (challengeId: string, landsCompleted: number, attempts: number) => {
    const res = await fetch('/api/challenges/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user?.id, challengeId, landsCompleted, attempts })
    });
    const data = await res.json();
    if (res.ok) {
      setChallenges(prev =>
        prev.map(c =>
          c.id === challengeId
            ? { ...c, is_completed: true, failed: data.failed }
            : c
        )
      );
      setXPModalData({
        earnedXP: data.earnedXP,
        bonusXP: data.bonusXP,
        projectedXP: data.projectedXP,
        projectedLevel: data.projectedLevel,
        wildSlotAwarded: data.willGetWildSlot,
        currentLevel: data.currentLevel,
        currentXP: data.currentXP,
      });
      setDailyLandsData(null);
    } else {
      console.error('Complete with lands failed:', data.error);
    }
  };

  const handleComplete = async (challenge: Challenge) => {
    if (!user?.id) return;

    switch(challenge.type) {
      case 'daily':
      case 'initial':
        if (challenge.trick_id && challenge.obstacle_id) {
          setDailyLandsData({ challengeId: challenge.id, trickId: challenge.trick_id, obstacleId: challenge.obstacle_id });
        }
        break;

      case 'boss':
      case 'line':
      case 'combo':
        const res = await fetch('/api/challenges/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user.id, challengeId: challenge.id })
        });
        const data = await res.json();
        if (res.ok) {
          setChallenges(prev =>
            prev.map(c => c.id === challenge.id ? { ...c, is_completed: true } : c)
          );
          setXPModalData({
            earnedXP: data.earnedXP,
            projectedXP: data.projectedXP || (user?.xp_current || 0) + data.earnedXP,
            projectedLevel: data.level,
            wildSlotAwarded: data.wildSlotAwarded || false
          });
        }
        if (challenge.type === 'combo') setTrickModalData({ challengeId: challenge.id, challengeType: 'combo' });
        break;

      default:
        console.warn('Unknown challenge type', challenge.type);
    }
  };

  const handleDelete = async (challengeId: string) => {
    try {
      const res = await fetch(`/api/challenges/${challengeId}`, { method: 'DELETE' });
      if (res.ok) setChallenges(prev => prev.filter(c => c.id !== challengeId));
    } catch (err) { console.error('Delete request failed:', err); }
  };

  const activeChallenges = challenges.filter(c => !c.is_completed);
  const completedChallenges = challenges.filter(c => c.is_completed);
  const canGenerateMore =
    activeChallenges.filter(c => c.type === 'daily').length < MAX_DAILY ||
    activeChallenges.filter(c => c.type === 'line').length < MAX_LINE ||
    activeChallenges.filter(c => c.type === 'combo').length < MAX_COMBO ||
    activeChallenges.filter(c => c.type === 'boss').length < MAX_BOSS;

  if (loading) return <p>Loading challenges...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">Active Challenges</h2>
        <div className="space-y-4">
          {activeChallenges.map(c => (
            <ChallengeItem key={c.id} challenge={c} onComplete={handleComplete} onDelete={handleDelete} />
          ))}
        </div>
      </div>

      {completedChallenges.length > 0 && (
        <div>
          <h2 className="text-xl font-bold mb-2">Completed Challenges</h2>
          <div className="space-y-4">
            {completedChallenges.map(c => (
              <ChallengeItem key={c.id} challenge={c} onComplete={handleComplete} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}

      {canGenerateMore && (
        <div className="mt-4">
          <button
            onClick={async () => {
              setLoading(true);
              try {
                const res = await fetch('/api/challenges', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId: user.id }),
                });
                const data = await res.json();
                if (res.ok && data.challenges) setChallenges(prev => [...prev, ...data.challenges]);
              } catch (err) {
                console.error('Failed to generate more challenges:', err);
              } finally { setLoading(false); }
            }}
            className="bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600"
          >
            Generate More Challenges
          </button>
        </div>
      )}

      {xpModalData && (
        <XPLevelModal
          data={xpModalData}
          onClose={() => setXPModalData(null)}
          onConfirm={async () => {
            await fetch('/api/users/xp/update', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({
                userId: user.id,
                earnedXP: xpModalData.earnedXP + (xpModalData.bonusXP || 0),
                wildSlotAwarded: xpModalData.wildSlotAwarded,
              })
            });
            setXPModalData(null);
            fetchChallenges();
          }}
        />
      )}

      {trickModalData && (
        <TrickCreationModal
          challengeId={trickModalData.challengeId}
          type={trickModalData.challengeType}
          onClose={() => setTrickModalData(null)}
          onSuccess={() => { setTrickModalData(null); fetchChallenges(); }}
        />
      )}

      {dailyLandsData && (
        <DailyLandsModal
          data={dailyLandsData}
          onClose={() => setDailyLandsData(null)}
          onSubmit={(landsCompleted, attempts) => {
            const { challengeId } = dailyLandsData;
            if (!challengeId || !user?.id) {
              console.error('Missing userId or challengeId', { userId: user?.id, challengeId });
              return;
            }
            handleCompleteWithLands(challengeId, Number(landsCompleted), Number(attempts));
          }}
        />
      )}
    </div>
  );
}

import { ChallengeList } from '@/app/skate/challenges/components/ChallengeList';

export default function ChallengesPage() {
  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Your Challenges</h1>
      <ChallengeList />
    </div>
  );
}

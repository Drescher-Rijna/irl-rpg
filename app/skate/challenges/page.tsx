import { ChallengeList } from '@/app/skate/challenges/components/ChallengeList';
import PageWrapper from '@/components/ui/PageWrapper';

export default function ChallengesPage() {
  return (
    <PageWrapper>
      <h1 className="text-2xl font-bold mb-4">Your Challenges</h1>
      <ChallengeList />
    </PageWrapper>
  );
}

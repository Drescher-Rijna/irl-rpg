type Trick = {
  id: string;
  name: string;
  tier: number;
  consistency: number;
};

type DailyChallenge = {
  trick_id: string;
  name: string;
  tier: number;
  xp_reward: number;
};

export const generateDailyChallenges = (
  tricks: Trick[],
  completedTrickIds: string[] = [],
  totalChallenges = 3
): DailyChallenge[] => {
  // Filter out tricks fully mastered
  const available = tricks.filter(
    t => !completedTrickIds.includes(t.id) || t.tier > 1
  );
  console.log('Available Tricks:', tricks);

  if (!available.length) return [];

  const tier1and2 = available.filter(t => t.tier <= 2);
  const tier3 = available.filter(t => t.tier === 3);

  // Calculate how many from tier1/2 vs tier3
  const tier12Count = Math.min(Math.ceil(totalChallenges * 0.8), tier1and2.length);
  const tier3Count = Math.min(totalChallenges - tier12Count, tier3.length);

  const challenges: DailyChallenge[] = [];

  // Pick tier1/2 challenges
  if (tier12Count > 0) {
    const tier12Selection = tier1and2.sort(() => Math.random() - 0.5).slice(0, tier12Count);
    challenges.push(...tier12Selection.map(trick => ({
      trick_id: trick.id,
      name: `Daily Challenge: ${trick.name}`,
      tier: trick.tier,
      xp_reward: 50 * trick.tier,
    })));
  }

  // Pick tier3 challenges
  if (tier3Count > 0) {
    const tier3Selection = tier3.sort(() => Math.random() - 0.5).slice(0, tier3Count);
    challenges.push(...tier3Selection.map(trick => ({
      trick_id: trick.id,
      name: `Daily Challenge: ${trick.name}`,
      tier: trick.tier,
      xp_reward: 50 * trick.tier,
    })));
  }

  // Fallback: if we still have fewer than totalChallenges, fill from remaining
  const remaining = totalChallenges - challenges.length;
  if (remaining > 0) {
    const remainingTricks = available.filter(t => !challenges.some(c => c.trick_id === t.id));
    if (remainingTricks.length > 0) {
      const extraSelection = remainingTricks.sort(() => Math.random() - 0.5).slice(0, remaining);
      challenges.push(...extraSelection.map(trick => ({
        trick_id: trick.id,
        name: `Daily Challenge: ${trick.name}`,
        tier: trick.tier,
        xp_reward: 50 * trick.tier,
      })));
    }
  }
console.log('Generated Challenges:', challenges);
  return challenges.sort(() => Math.random() - 0.5);
};

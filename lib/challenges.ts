type Trick = {
  id: string;
  name: string;
  tier: number;
  consistency: number; // average success out of 10
};

type Challenge = {
  trick_id: string;
  name: string;
  description: string;
  tier: number;
  difficulty: number;
  xp_reward: number;
  unlock_condition: Record<string, any>;
};

export const generateDailyChallenges = (
  tricks: Trick[],
  completedTrickIds: string[] = [],
  totalChallenges = 3
): Challenge[] => {
  // Filter out tricks fully mastered (tier 1 with high consistency)
  const available = tricks.filter(
    t => !completedTrickIds.includes(t.id) || t.tier > 1
  );
  console.log('Available Tricks:', tricks);

  if (!available.length) return [];

  const tier1and2 = available.filter(t => t.tier <= 2);
  const tier3 = available.filter(t => t.tier === 3);

  // Calculate distribution 80/20 rule
  const tier12Count = Math.min(Math.ceil(totalChallenges * 0.8), tier1and2.length);
  const tier3Count = Math.min(totalChallenges - tier12Count, tier3.length);

  const challenges: Challenge[] = [];

  // Function to create nuanced descriptions
  const createDescription = (trick: Trick): { description: string; unlock: any; xp: number; difficulty: number } => {
    if (trick.tier === 1 || trick.tier === 2) {
      // Consistency-based
      const target = Math.min(10, Math.ceil(trick.consistency + 2)); // push consistency up
      return {
        description: `Land ${trick.name} ${target}/10 times`,
        unlock: { type: 'consistency', target },
        xp: 40 + target * 5, // higher target = more XP
        difficulty: trick.tier + (target > 7 ? 2 : 1),
      };
    } else {
      // Tier 3 beginner challenge → simple attempt or land count
      const attempts = 10;
      const lands = 3;
      return {
        description: `Attempt ${trick.name} ${attempts} times and land at least ${lands}`,
        unlock: { type: 'attempts', attempts, lands },
        xp: 50,
        difficulty: 3,
      };
    }
  };

  // Pick tier1/2 challenges
  if (tier12Count > 0) {
    const tier12Selection = tier1and2.sort(() => Math.random() - 0.5).slice(0, tier12Count);
    tier12Selection.forEach(trick => {
      const { description, unlock, xp, difficulty } = createDescription(trick);
      challenges.push({
        trick_id: trick.id,
        name: `Daily Challenge: ${trick.name}`,
        description,
        tier: trick.tier,
        difficulty,
        xp_reward: xp,
        unlock_condition: unlock,
      });
    });
  }

  // Pick tier3 challenges
  if (tier3Count > 0) {
    const tier3Selection = tier3.sort(() => Math.random() - 0.5).slice(0, tier3Count);
    tier3Selection.forEach(trick => {
      const { description, unlock, xp, difficulty } = createDescription(trick);
      challenges.push({
        trick_id: trick.id,
        name: `Daily Challenge: ${trick.name}`,
        description,
        tier: trick.tier,
        difficulty,
        xp_reward: xp,
        unlock_condition: unlock,
      });
    });
  }

  // Fallback fill
  const remaining = totalChallenges - challenges.length;
  if (remaining > 0) {
    const remainingTricks = available.filter(t => !challenges.some(c => c.trick_id === t.id));
    if (remainingTricks.length > 0) {
      const extraSelection = remainingTricks.sort(() => Math.random() - 0.5).slice(0, remaining);
      extraSelection.forEach(trick => {
        const { description, unlock, xp, difficulty } = createDescription(trick);
        challenges.push({
          trick_id: trick.id,
          name: `Daily Challenge: ${trick.name}`,
          description,
          tier: trick.tier,
          difficulty,
          xp_reward: xp,
          unlock_condition: unlock,
        });
      });
    }
  }

  console.log('Generated Challenges:', challenges);
  return challenges.sort(() => Math.random() - 0.5);
};

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
  type: 'daily' | 'boss' | 'line' | 'combo';
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
        type: 'daily',
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
        type: 'daily',
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
          type: 'daily',
          unlock_condition: unlock,
        });
      });
    }
  }

  console.log('Generated Challenges:', challenges);
  return challenges.sort(() => Math.random() - 0.5);
};

export const generateBossChallenge = async (
  tricks: any[], // raw tricks with obstacles + consistency
  existing: any[]
): Promise<Challenge | null> => {
  // Find a candidate trick with decent consistency (>= 6/10) on some obstacle
  const candidate = tricks.find(t =>
    t.obstacles?.some(o => o.consistency >= 6)
  );
  if (!candidate) return null;

  // Pick the obstacle where they’re consistent
  const currentObstacle = candidate.obstacles.find(o => o.consistency >= 6);
  if (!currentObstacle) return null;

  // Find the next harder obstacle (higher difficulty)
  const harderObstacle = candidate.obstaclesAvailable
    .filter(o => o.difficulty > currentObstacle.difficulty)
    .sort((a, b) => a.difficulty - b.difficulty)[0];

  if (!harderObstacle) return null; // no progression possible

  return {
    trick_id: candidate.id,
    name: `Boss Challenge: ${candidate.name}`,
    description: `Land ${candidate.name} on ${harderObstacle.name}`,
    tier: candidate.tier,
    difficulty: candidate.tier + harderObstacle.difficulty,
    xp_reward: 200 + harderObstacle.difficulty * 20,
    type: 'boss',
    unlock_condition: {
      type: 'obstacle',
      trick_id: candidate.id,
      obstacle_id: harderObstacle.id,
    },
    type: 'boss',
  };
};


export const generateComboChallenge = (tricks: Trick[], existing: Challenge[]): Challenge | null => {
  const pool = tricks.filter(t => t.tier <= 2);
  if (pool.length < 2) return null;

  // Randomly pick 2 tricks
  const [a, b] = pool.sort(() => Math.random() - 0.5).slice(0, 2);

  // Avoid duplicates
  const comboKey = [a.id, b.id].sort().join('-');
  if (existing.some(c => c.type === 'combo' && c.unlock_condition?.comboKey === comboKey)) return null;

  return {
    trick_id: '', // combos are multi-trick, can leave null or reference later
    name: `Combo Challenge: ${a.name} + ${b.name}`,
    description: `Land ${a.name} into ${b.name} as one combo`,
    tier: Math.max(a.tier, b.tier),
    difficulty: 3,
    xp_reward: 100,
    type: 'combo',
    unlock_condition: { type: 'combo', comboKey, tricks: [a.id, b.id] },
  };
};

export const generateLineChallenge = (tricks: Trick[], existing: Challenge[]): Challenge | null => {
  const pool = tricks.filter(t => t.consistency >= 6); // only tricks user can do reliably
  if (pool.length < 2) return null;

  const line = pool.sort(() => Math.random() - 0.5).slice(0, 2);

  const lineKey = line.map(t => t.id).sort().join('-');
  if (existing.some(c => c.type === 'line' && c.unlock_condition?.lineKey === lineKey)) return null;

  return {
    trick_id: '',
    name: `Line Challenge: ${line.map(t => t.name).join(' → ')}`,
    description: `Land ${line[0].name} into ${line[1].name} in one run`,
    tier: Math.max(...line.map(t => t.tier)),
    difficulty: 3,
    xp_reward: 120,
    type: 'line',
    unlock_condition: { type: 'line', lineKey, tricks: line.map(t => t.id) },
  };
};

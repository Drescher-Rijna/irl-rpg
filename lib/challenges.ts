type Trick = {
  id: string;
  name: string;
  tier: number; // overall tier across obstacles
  consistency: number; // average out of 10
  obstacles?: {
    id: string;
    name: string;
    difficulty: number; // used for tier mapping
  }[];
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
  obstacle_id?: string;
};

export const generateDailyChallenges = (
  tricks: Trick[],
  completedTrickIds: string[] = [],
  totalChallenges = 5
): Challenge[] => {
  // Filter out tricks already completed unless tier >1
  const available = tricks.filter(t => !completedTrickIds.includes(t.id) || t.tier > 1);
  if (!available.length) return [];

  // Separate tricks by tier
  const tier1 = available.filter(t => t.tier === 1);
  const tier2 = available.filter(t => t.tier === 2);
  const tier3 = available.filter(t => t.tier === 3);

  // Determine counts according to distribution and availability
  let t1Count = Math.floor(totalChallenges * 0.7);
  let t2Count = Math.floor(totalChallenges * 0.2);
  let t3Count = totalChallenges - t1Count - t2Count;

  // Shift counts if some tiers are missing
  if (!tier1.length) {
    t2Count = Math.floor(totalChallenges * 0.8);
    t3Count = totalChallenges - t2Count;
    t1Count = 0;
  }
  if (!tier2.length) {
    t3Count = totalChallenges - t1Count;
    t2Count = 0;
  }
  if (!tier1.length && !tier2.length) {
    t3Count = totalChallenges;
    t1Count = 0;
    t2Count = 0;
  }

  const challenges: Challenge[] = [];

  const createChallenge = (trick: Trick, targetTier: number): Challenge => {
    // Pick an obstacle matching the target tier if possible
    const obstacle = trick.obstacles?.find(o => {
      if (targetTier === 1) return o.difficulty <= 2;
      if (targetTier === 2) return o.difficulty === 3 || o.difficulty === 4;
      return o.difficulty >= 5;
    }) || trick.obstacles?.[0]; // fallback first obstacle

    // Create description based on tier/consistency
    if (targetTier <= 2) {
      const target = Math.min(10, Math.ceil(trick.consistency + 2));
      return {
        trick_id: trick.id,
        name: `Daily Challenge: ${trick.name}`,
        description: `Land ${trick.name} ${target}/10 times`,
        tier: trick.tier,
        difficulty: trick.tier + (target > 7 ? 2 : 1),
        xp_reward: 40 + target * 5,
        type: 'daily',
        unlock_condition: { type: 'consistency', target },
        obstacle_id: obstacle?.id,
      };
    } else {
      const attempts = 10;
      const lands = 3;
      return {
        trick_id: trick.id,
        name: `Daily Challenge: ${trick.name}`,
        description: `Attempt ${trick.name} ${attempts} times and land at least ${lands}`,
        tier: trick.tier,
        difficulty: 3,
        xp_reward: 50,
        type: 'daily',
        unlock_condition: { type: 'attempts', attempts, lands },
        obstacle_id: obstacle?.id,
      };
    }
  };

  const pickRandom = (arr: Trick[], count: number, tier: number) => {
    const shuffled = arr.sort(() => Math.random() - 0.5).slice(0, count);
    shuffled.forEach(t => challenges.push(createChallenge(t, tier)));
  };

  if (t1Count > 0) pickRandom(tier1, t1Count, 1);
  if (t2Count > 0) pickRandom(tier2, t2Count, 2);
  if (t3Count > 0) pickRandom(tier3, t3Count, 3);

  return challenges.sort(() => Math.random() - 0.5);
};



export const generateBossChallenge = async (
  tricks: Trick[],
  existing: Challenge[]
): Promise<Challenge | null> => {
  // Pick trick with some consistent obstacle
  const candidate = tricks.find(t => t.obstacles?.some(o => o.consistency >= 6));
  if (!candidate) return null;

  const currentObstacle = candidate.obstacles!.find(o => o.consistency >= 6);
  if (!currentObstacle) return null;

  // Pick next harder obstacle
  const harderObstacle = candidate.obstacles!.filter(o => o.difficulty > currentObstacle.difficulty)
    .sort((a, b) => a.difficulty - b.difficulty)[0];

  if (!harderObstacle) return null;

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
    obstacle_id: harderObstacle.id,
  };
};


export const generateComboChallenge = (tricks: Trick[], existing: Challenge[]): Challenge | null => {
  const pool = tricks.filter(t => t.tier <= 2);
  if (pool.length < 2) return null;

  const [a, b] = pool.sort(() => Math.random() - 0.5).slice(0, 2);

  const comboKey = [a.id, b.id].sort().join('-');
  if (existing.some(c => c.type === 'combo' && c.unlock_condition?.comboKey === comboKey)) return null;

  return {
    trick_id: '',
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
  const pool = tricks.filter(t => t.consistency >= 6);
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


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
  totalChallenges = 3
): Challenge[] => {
  const available = tricks.filter(
    t => !completedTrickIds.includes(t.id) || (t.consistency ?? 0) < 10
  );
  if (!available.length) return [];

  const tier1 = available.filter(t => t.tier === 1);
  const tier2 = available.filter(t => t.tier === 2);
  const tier3 = available.filter(t => t.tier === 3);

  // Compute counts for distribution
  let tier1Count = Math.min(Math.ceil(totalChallenges * 0.7), tier1.length);
  let tier2Count = Math.min(Math.ceil(totalChallenges * 0.2), tier2.length);
  let tier3Count = Math.min(totalChallenges - tier1Count - tier2Count, tier3.length);

  // Adjust if fewer tricks in a tier
  const totalSelected = tier1Count + tier2Count + tier3Count;
  if (totalSelected < totalChallenges) {
    const remaining = totalChallenges - totalSelected;
    const extraTier1 = Math.min(remaining, tier1.length - tier1Count);
    tier1Count += extraTier1;
  }

  const challenges: Challenge[] = [];

  const createDescription = (trick: Trick): { description: string; unlock: any; xp: number; difficulty: number; obstacle_id?: string } => {
    const obstacle = trick.obstacles?.[0]; // pick obstacle for challenge
    const consistency = trick.consistency ?? 0;

    if (trick.consistency === undefined) {
      // Brand new trick → baseline attempts
      const attempts = 10;
      const lands = 3;
      return {
        description: `Attempt ${trick.name} ${attempts} times and land at least ${lands}`,
        unlock: { type: 'attempts', attempts, lands },
        xp: 50,
        difficulty: 1,
        obstacle_id: obstacle?.id,
      };
    } else {
      // Existing trick → push consistency higher
      let target = Math.min(10, Math.ceil(consistency + 1));

      // Occasional maxed-out Tier 1 trick: skip 9/10–10/10 once in a while
      if (trick.tier === 1 && consistency >= 9 && Math.random() < 0.7) {
        target = consistency; // keep current consistency
      }

      return {
        description: `Land ${trick.name} ${target}/10 times`,
        unlock: { type: 'consistency', target },
        xp: 40 + target * 5,
        difficulty: trick.tier + (target > 7 ? 2 : 1),
        obstacle_id: obstacle?.id,
      };
    }
  };

  const pickChallenges = (pool: Trick[], count: number) => {
    pool.sort(() => Math.random() - 0.5).slice(0, count).forEach(trick => {
      const desc = createDescription(trick);
      challenges.push({
        trick_id: trick.id,
        name: `Daily Challenge: ${trick.name}`,
        description: desc.description,
        tier: trick.tier,
        difficulty: desc.difficulty,
        xp_reward: desc.xp,
        type: 'daily',
        unlock_condition: desc.unlock,
        obstacle_id: desc.obstacle_id,
      });
    });
  };

  if (tier1Count > 0) pickChallenges(tier1, tier1Count);
  if (tier2Count > 0) pickChallenges(tier2, tier2Count);
  if (tier3Count > 0) pickChallenges(tier3, tier3Count);

  return challenges.sort(() => Math.random() - 0.5);
};




export const generateBossChallenge = (tricks: any[], existing: any[]): Challenge | null => {
  // Filter tricks with consistency ≥6
  const candidates = tricks.filter(t => t.obstacles?.some(o => o.consistency >= 6));
  if (!candidates.length) return null;

  const candidate = candidates.sort(() => Math.random() - 0.5)[0];

  const currentObstacle = candidate.obstacles.find(o => o.consistency >= 6);
  if (!currentObstacle) return null;

  // Pick the next harder obstacle
  const harderObstacle = candidate.obstacles
    .filter(o => o.difficulty > currentObstacle.difficulty)
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
    unlock_condition: { type: 'obstacle', trick_id: candidate.id, obstacle_id: harderObstacle.id },
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
    trick_id: '', // multi-trick
    name: `Combo Challenge: ${a.name} + ${b.name}`,
    description: `Land ${a.name} into ${b.name} as one combo`,
    tier: Math.max(a.tier, b.tier),
    difficulty: 3,
    xp_reward: 100,
    type: 'combo',
    unlock_condition: { type: 'combo', comboKey, tricks: [a.id, b.id] },
    obstacle_id: null, // user defines later
  };
};


export const generateLineChallenge = (tricks: Trick[], existing: Challenge[]): Challenge | null => {
  const pool = tricks.filter(t => t.consistency >= 6);
  if (pool.length < 2) return null;

  const lineTricks = pool.sort(() => Math.random() - 0.5).slice(0, 2);
  const lineKey = lineTricks.map(t => t.id).sort().join('-');

  if (existing.some(c => c.type === 'line' && c.unlock_condition?.lineKey === lineKey)) return null;

  return {
    trick_id: '',
    name: `Line Challenge: ${lineTricks.map(t => t.name).join(' → ')}`,
    description: `Land ${lineTricks[0].name} into ${lineTricks[1].name} in one run`,
    tier: Math.max(...lineTricks.map(t => t.tier)),
    difficulty: 3,
    xp_reward: 120,
    type: 'line',
    unlock_condition: { type: 'line', lineKey, tricks: lineTricks.map(t => t.id) },
    obstacle_id: null, // not tracked
  };
};



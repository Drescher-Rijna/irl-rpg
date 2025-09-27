type Trick = {
  id: string;
  name: string;
  tier: number;
  consistency: number;
  obstacles?: { id: string; name: string; difficulty: number; consistency?: number }[];
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
  obstacle_id?: string | null;
};

// --- DAILY ---
export const generateDailyChallenges = (
  tricks: Trick[],
  completedTrickIds: string[] = [],
  totalChallenges = 3
): Challenge[] => {
  const available = tricks.filter(
    t => !completedTrickIds.includes(t.id) && (t.consistency ?? 0) < 10
  );
  if (!available.length) return [];

  const tier1 = available.filter(t => t.tier === 1);
  const tier2 = available.filter(t => t.tier === 2);
  const tier3 = available.filter(t => t.tier === 3);

  let tier1Count = Math.min(Math.ceil(totalChallenges * 0.7), tier1.length);
  let tier2Count = Math.min(Math.ceil(totalChallenges * 0.2), tier2.length);
  let tier3Count = Math.min(totalChallenges - tier1Count - tier2Count, tier3.length);

  const challenges: Challenge[] = [];

  const createDaily = (trick: Trick): Challenge => {
    const obstacle = trick.obstacles?.[0];
    const consistency = trick.consistency ?? 0;

    let description: string;
    let unlock: any;
    let xp: number;
    let difficulty: number;

    if (trick.consistency === undefined) {
      description = `Attempt ${trick.name}${obstacle ? ` on ${obstacle.name}` : ''} 10 times and land at least 3`;
      unlock = { type: 'attempts', attempts: 10, lands: 3 };
      xp = 50;
      difficulty = 1;
    } else {
      let target = Math.min(10, Math.ceil(consistency + 1));
      description = `Land ${trick.name}${obstacle ? ` on ${obstacle.name}` : ''} ${target}/10 times`;
      unlock = { type: 'consistency', target };
      xp = 40 + target * 5;
      difficulty = trick.tier + (target > 7 ? 2 : 1);
    }

    return {
      trick_id: trick.id,
      name: `Daily Challenge: ${trick.name}`,
      description,
      tier: trick.tier,
      difficulty,
      xp_reward: xp,
      type: 'daily',
      unlock_condition: unlock,
      obstacle_id: obstacle?.id,
    };
  };

  const pickRandom = <T>(arr: T[], count: number): T[] =>
    arr.sort(() => Math.random() - 0.5).slice(0, count);

  challenges.push(...pickRandom(tier1, tier1Count).map(createDaily));
  challenges.push(...pickRandom(tier2, tier2Count).map(createDaily));
  challenges.push(...pickRandom(tier3, tier3Count).map(createDaily));

  return challenges.sort(() => Math.random() - 0.5);
};

// --- LINE (from dailies, exclude tier 3) ---
export const generateLineChallenge = (dailyChallenges: Challenge[]): Challenge | null => {
  const pool = dailyChallenges.filter(c => c.tier < 3);
  if (pool.length < 2) return null;

  const pickRandom = <T>(arr: T[], count: number): T[] =>
    arr.sort(() => Math.random() - 0.5).slice(0, count);

  const lineTricks = pickRandom(pool, Math.min(3, pool.length));
  const lineKey = lineTricks.map(t => t.trick_id).sort().join('-');

  return {
    trick_id: '',
    name: `Line Challenge: ${lineTricks.map(t => t.name.replace('Daily Challenge: ', '')).join(' → ')}`,
    description: `Land ${lineTricks.map(t => t.name.replace('Daily Challenge: ', '')).join(' into ')}`,
    tier: Math.max(...lineTricks.map(t => t.tier)),
    difficulty: 3,
    xp_reward: 120,
    type: 'line',
    unlock_condition: { type: 'line', lineKey, tricks: lineTricks.map(t => t.trick_id) },
    obstacle_id: null,
  };
};

// --- BOSS (chance-based, from daily) ---
export const generateBossChallenge = (dailyChallenges: Challenge[], chance = 0.5): Challenge | null => {
  if (Math.random() > chance) return null;
  const candidates = dailyChallenges.filter(c => c.obstacle_id); // must have obstacle
  if (!candidates.length) return null;

  const candidate = candidates.sort(() => Math.random() - 0.5)[0];
  return {
    ...candidate,
    name: `Boss Challenge: ${candidate.name.replace('Daily Challenge: ', '')}`,
    description: `Prove mastery of ${candidate.name.replace('Daily Challenge: ', '')}`,
    type: 'boss',
    xp_reward: candidate.xp_reward + 100,
  };
};

// --- COMBO (chance-based, from dailies tier ≤ 2) ---
export const generateComboChallenge = (dailyChallenges: Challenge[], chance = 0.5): Challenge | null => {
  if (Math.random() > chance) return null;
  const pool = dailyChallenges.filter(c => c.tier <= 2);
  if (pool.length < 2) return null;

  const [a, b] = pool.sort(() => Math.random() - 0.5).slice(0, 2);
  const comboKey = [a.trick_id, b.trick_id].sort().join('-');

  return {
    trick_id: '',
    name: `Combo Challenge: ${a.name.replace('Daily Challenge: ', '')} + ${b.name.replace('Daily Challenge: ', '')}`,
    description: `Land ${a.name.replace('Daily Challenge: ', '')} into ${b.name.replace('Daily Challenge: ', '')}`,
    tier: Math.max(a.tier, b.tier),
    difficulty: 3,
    xp_reward: 100,
    type: 'combo',
    unlock_condition: { type: 'combo', comboKey, tricks: [a.trick_id, b.trick_id] },
    obstacle_id: null,
  };
};

// --- GENERATE FULL SET ---
export const generateChallengesForDay = (tricks: Trick[], completedTrickIds: string[] = []) => {
  const dailies = generateDailyChallenges(tricks, completedTrickIds, 3);

  const line = generateLineChallenge(dailies);
  const boss = generateBossChallenge(dailies, 0.5); // 50% chance
  const combo = generateComboChallenge(dailies, 0.5); // 50% chance

  return {
    dailies,
    line: line || undefined,
    boss: boss || undefined,
    combo: combo || undefined,
  };
};

// Can generarte challenges must have at least 5 tricks
export const canGenerateChallenges = (tricks: Trick[]) => tricks.length >= 5;

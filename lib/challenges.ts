import { Trick, Challenge, Obstacle } from '@/types';

// --- INITIAL ---
export const generateInitialChallenge = (
  trick: Trick,
  allObstacles: Obstacle[]
): Challenge | null => {
  if (!trick.obstacle_type_ids?.length) return null;

  // 1. Find all obstacles for the user matching the trick's obstacle types
  const candidates = allObstacles.filter((o) =>
    trick.obstacle_type_ids.includes(o.obstacle_type_id)
  );

  if (!candidates.length) return null;

  // 2. Special rule: if flat exists, pick Flatground
  const flatCandidate = candidates.find(
    (o) => o.name.toLowerCase() === "flatground"
  );
  const obstacle =
    flatCandidate || candidates.sort((a, b) => a.difficulty - b.difficulty)[0];

  // 3. Create intro challenge
  return {
    trick_id: trick.id,
    obstacle_id: obstacle.id,
    name: `Intro Challenge: ${trick.name}`,
    description: `Land ${trick.name} on ${obstacle.name} as many times as you can out of 10.`,
    type: "initial",
    tier: trick.tier ?? 3, // start as tier 3 until proven otherwise
    difficulty: obstacle.difficulty,
    xp_reward: 50, // static reward for intro challenge
    unlock_condition: { type: "attempts", attempts: 10 },
    is_completed: false,
  };
};

// --- DAILY ---
export const generateDailyChallenges = (
  tricks: Trick[],
  completedTrickIds: string[] = [],
  totalChallenges = 5
): Challenge[] => {
  const available = tricks.filter(
    t => !completedTrickIds.includes(t.id) && (t.consistency ?? 0) < 10
  );
  if (!available.length) return [];

  const tier1 = available.filter(t => t.tier === 1);
  const tier2 = available.filter(t => t.tier === 2);
  const tier3 = available.filter(t => t.tier === 3);

  const tier1Count = Math.min(Math.ceil(totalChallenges * 0.7), tier1.length);
  const tier2Count = Math.min(Math.ceil(totalChallenges * 0.2), tier2.length);
  const tier3Count = Math.min(totalChallenges - tier1Count - tier2Count, tier3.length);

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
      const target = Math.min(10, Math.ceil(consistency + 1));
      description = `Land ${trick.name}${obstacle ? ` on ${obstacle.name}` : ''} ${target}/10 times`;
      unlock = { type: 'consistency', target };
      xp = 40 + target * 5;
      difficulty = (trick.tier ?? 1) + (target > 7 ? 2 : 1);
    }

    return {
      trick_id: trick.id,
      name: `Daily Challenge: ${trick.name}`,
      description,
      difficulty,
      tier: trick.tier ?? 1,
      xp_reward: xp,
      type: 'daily',
      unlock_condition: unlock,
      obstacle_id: obstacle?.id,
      is_completed: false,
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
    obstacle_id: '',
    is_completed: false,
  };
};

/**
 * Generate a Boss Challenge for a given trick
 * - Requires the trick to have an obstacle
 * - Picks the next harder obstacle (if any) as the boss target
 * - Ensures no duplicate boss for the same trick
 */
export const generateBossChallenge = (
  availableTricks: Trick[],
  existingChallenges: Challenge[],
  allObstacles: Obstacle[],
  chance = 0.5
): Challenge | null => {
  if (Math.random() > chance) return null;

  // Avoid duplicate bosses for same trick
  const existingBossTrickIds = existingChallenges
    .filter((c) => c.type === "boss")
    .map((c) => c.trick_id);

  const candidates = availableTricks.filter(
    (t) => !existingBossTrickIds.includes(t.id) && t.obstacles?.length
  );
  if (!candidates.length) return null;

  const trick = candidates[Math.floor(Math.random() * candidates.length)];
  const currentObstacle = trick.obstacles[0]; // assuming tricks have at least one obstacle
  if (!currentObstacle) return null;

  // Find the next harder obstacle of the same type
  const harderObstacle = allObstacles
    .filter(
      (o) =>
        o.obstacle_type_id === currentObstacle.obstacle_type_id &&
        o.difficulty > currentObstacle.difficulty
    )
    .sort((a, b) => a.difficulty - b.difficulty)[0];

  if (!harderObstacle) return null;

  return {
    trick_id: trick.id,
    name: `Boss Challenge: ${trick.name}`,
    description: `Defeat the Boss by landing ${trick.name} on a tougher obstacle (${harderObstacle.name}).`,
    type: "boss",
    tier: trick.tier ?? 1,
    difficulty: harderObstacle.difficulty,
    xp_reward: 100 + (trick.tier ?? 1) * harderObstacle.difficulty,
    unlock_condition: { type: "boss", trick_id: trick.id, obstacle_id: harderObstacle.id },
    obstacle_id: harderObstacle.id,
    is_completed: false,
  };
};

/**
 * Generate a Combo Challenge
 * - Requires at least 2 tricks of tier ≤ 2
 * - Difficulty = average of their obstacle difficulties
 */
export const generateComboChallenge = (
  availableTricks: Trick[],
  existingChallenges: Challenge[],
  chance = 0.5
): Challenge | null => {
  if (Math.random() > chance) return null;

  const pool = availableTricks.filter((t) => (t.tier ?? 1) <= 2 && t.obstacles?.length);
  if (pool.length < 2) return null;

  const [a, b] = pool.sort(() => Math.random() - 0.5).slice(0, 2);

  const avgDifficulty =
    (a.obstacles[0].difficulty + b.obstacles[0].difficulty) / 2 * 1.2;

  const comboKey = [a.id, b.id].sort().join("-");

  return {
    trick_id: "",
    name: `Combo Challenge: ${a.name} + ${b.name}`,
    description: `Land ${a.name} into ${b.name}.`,
    type: "combo",
    tier: Math.max(a.tier ?? 1, b.tier ?? 1),
    difficulty: avgDifficulty,
    xp_reward: 100 + avgDifficulty * 10,
    unlock_condition: { type: "combo", comboKey, tricks: [a.id, b.id] },
    obstacle_id: "",
    is_completed: false,
  };
};

// --- GENERATE FULL SET ---
export const generateChallengesForDay = (tricks: Trick[], allObstacles: Obstacle[], completedTrickIds: string[] = []) => {
  const dailies = generateDailyChallenges(tricks, completedTrickIds, 3);

  const line = generateLineChallenge(dailies);
  const boss = generateBossChallenge(tricks, dailies, allObstacles, 0.5); // 50% chance
  const combo = generateComboChallenge(tricks, dailies, 0.5); // 50% chance

  return {
    dailies,
    line: line || undefined,
    boss: boss || undefined,
    combo: combo || undefined,
  };
};

// Can generarte challenges must have at least 5 tricks
export const canGenerateChallenges = (tricks: Trick[]) => tricks.length >= 5;

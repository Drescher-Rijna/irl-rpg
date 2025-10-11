import { Trick, Challenge, Obstacle } from '@/types';
import { useUserStore } from '@/store/useUserStore';

const playerLevel = useUserStore.getState().getLevel();

const calculateXPReward = (
  baseXP: number,
  obstacleDifficulty: number = 1,
  trickTier: number = 1,
  playerLevel: number = 1,
  multiplier: number = 1
): number => {
  const scaledBase = baseXP + trickTier * 10 + obstacleDifficulty * 8;
  const levelBonus = 1 + 0.02 * playerLevel;
  return Math.round(scaledBase * levelBonus * multiplier);
};

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
  const xp = calculateXPReward(40, obstacle.difficulty, trick.tier ?? 1, playerLevel, 0.8);

  return {
    trick_id: trick.id,
    obstacle_id: obstacle.id,
    name: `Intro Challenge: ${trick.name}`,
    description: `Land ${trick.name} on ${obstacle.name} as many times as you can out of 10.`,
    type: "initial",
    difficulty: obstacle.difficulty,
    xp_reward: xp, // static reward for intro challenge
    unlock_condition: { type: "attempts", attempts: 10 },
    completed: false,
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

  const candidates = available.flatMap(trick =>
    (trick.obstacles || []).map(obstacle => ({
      trick,
      obstacle,
      score: obstacle.score ?? 0,
    }))
  );

  if (!candidates.length) return [];

 const highScore = candidates.filter(c => c.score >= 7);  // 70%
  const midScore = candidates.filter(c => c.score >= 4 && c.score < 7); // 20%
  const lowScore = candidates.filter(c => c.score < 4);    // 10%

  const highCount = Math.min(Math.ceil(totalChallenges * 0.7), highScore.length);
  const midCount = Math.min(Math.ceil(totalChallenges * 0.2), midScore.length);
  const lowCount = Math.min(totalChallenges - highCount - midCount, lowScore.length);

  // 4️⃣ Helper to pick random items
  const pickRandom = <T>(arr: T[], count: number): T[] =>
    arr.sort(() => Math.random() - 0.5).slice(0, count);

  const selected = [
    ...pickRandom(highScore, highCount),
    ...pickRandom(midScore, midCount),
    ...pickRandom(lowScore, lowCount),
  ];

  // 5️⃣ Prevent duplicate tricks being used twice
  const usedTricks = new Set<string>();
  const uniqueSelected = selected.filter(({ trick }) => {
    if (usedTricks.has(trick.id)) return false;
    usedTricks.add(trick.id);
    return true;
  });

  // 6️⃣ Create Challenge Objects
  const challenges: Challenge[] = uniqueSelected.map(({ trick, obstacle, score }) => {
    const consistency = score ?? 0;
    const target = Math.min(10, Math.ceil(consistency + 1));

    const description =
      consistency < 3
        ? `Try to land ${trick.name} on ${obstacle.name} at least 3 times out of 10`
        : `Land ${trick.name} on ${obstacle.name} ${target}/10 times`;

    const difficulty =
      consistency >= 7 ? 3 : consistency >= 4 ? 2 : 1;

    const xp = calculateXPReward(40, obstacle.difficulty, trick.tier ?? 1, playerLevel);

    return {
      trick_id: trick.id,
      name: `Daily Challenge: ${trick.name}`,
      description,
      difficulty,
      xp_reward: xp,
      type: 'daily',
      unlock_condition: { type: 'consistency', target },
      obstacle_id: obstacle.id,
      completed: false,
    };
  });

  return challenges.sort(() => Math.random() - 0.5);
};

// --- LINE (from dailies, exclude tier 3) ---
export const generateLineChallenge = (dailyChallenges: Challenge[]): Challenge | null => {
  const pool = dailyChallenges.filter(c => (c.type === 'daily' && c.difficulty <= 3));
  if (pool.length < 2) return null;

  const pickRandom = <T>(arr: T[], count: number): T[] =>
    arr.sort(() => Math.random() - 0.5).slice(0, count);

  const lineTricks = pickRandom(pool, Math.min(3, pool.length));
  const avgDifficulty =
    lineTricks.reduce((acc, c) => acc + (c.difficulty ?? 1), 0) /
    lineTricks.length;

  // Line challenges give a higher multiplier
  const xp = calculateXPReward(80, avgDifficulty, 2, playerLevel, 1.4);

  const lineKey = lineTricks.map(t => t.trick_id).sort().join('-');

  return {
    trick_id: '',
    name: `Line Challenge: ${lineTricks.map(t => t.name.replace('Daily Challenge: ', '')).join(' → ')}`,
    description: `Land ${lineTricks.map(t => t.name.replace('Daily Challenge: ', '')).join(' into ')}`,
    difficulty: 3,
    xp_reward: xp,
    type: 'line',
    unlock_condition: { type: 'line', lineKey, tricks: lineTricks.map(t => t.trick_id) },
    obstacle_id: '',
    completed: false,
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

  const xp = calculateXPReward(100, harderObstacle.difficulty, trick.tier ?? 1, playerLevel, 1.5);

  return {
    trick_id: trick.id,
    name: `Boss Challenge: ${trick.name}`,
    description: `Land ${trick.name} on a (${harderObstacle.name}).`,
    type: "boss",
    difficulty: harderObstacle.difficulty,
    xp_reward: xp,
    unlock_condition: { type: "boss", trick_id: trick.id, obstacle_id: harderObstacle.id },
    obstacle_id: harderObstacle.id,
    completed: false,
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
    Math.round((a.obstacles[0].difficulty + b.obstacles[0].difficulty) / 2 * 1.2);

  const comboKey = [a.id, b.id].sort().join("-");

  const xp = calculateXPReward(80, avgDifficulty, 2, playerLevel, 1.3);

  return {
    trick_id: "",
    name: `Combo Challenge: ${a.name} + ${b.name}`,
    description: `Land ${a.name} into ${b.name}.`,
    type: "combo",
    difficulty: avgDifficulty,
    xp_reward: 100 + avgDifficulty * 10,
    unlock_condition: { type: "combo", comboKey, tricks: [a.id, b.id] },
    obstacle_id: "",
    completed: false,
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

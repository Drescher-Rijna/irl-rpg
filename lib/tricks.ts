import { supabase } from '@/lib/supabase';

export type Obstacle = {
  id: string;
  name: string;
  type: string;
  difficulty: number;
  score?: number; // optional consistency score
};

export type Trick = {
  id: string;
  name: string;
  stance: string;
  obstacles: Obstacle[];
  tier?: number;
};

// fetch all tricks from the database
export const fetchAllTricks = async (): Promise<Trick[]> => {
  // 1️⃣ Fetch all tricks with obstacles
  const { data: tricksData, error: tricksError } = await supabase
    .from('tricks')
    .select(`
      id,
      name,
      stance,
      tier,
      trick_obstacles (
        obstacle_id,
        obstacles (id, name, type, difficulty)
      )
    `);

  if (tricksError || !tricksData) {
    console.error('Error fetching tricks:', tricksError);
    return [];
  }

  // 2️⃣ Fetch all consistency scores
  const { data: consistencyData, error: consistencyError } = await supabase
    .from('trick_consistency')
    .select('*');

  if (consistencyError) {
    console.error('Error fetching consistency:', consistencyError);
    return [];
  }

  // Map consistency for quick lookup
  const consistencyMap: Record<string, number> = {};
  consistencyData.forEach((c: any) => {
    consistencyMap[`${c.trick_id}-${c.obstacle_id}`] = c.score;
  });

  // 3️⃣ Merge consistency into obstacles
  const tricks: Trick[] = tricksData.map((t: any) => ({
    id: t.id,
    name: t.name,
    stance: t.stance,
    tier: t.tier,
    obstacles: t.trick_obstacles.map((to: any) => ({
      ...to.obstacles,
      score: consistencyMap[`${t.id}-${to.obstacle_id}`] ?? 0
    }))
  }));

  return tricks;
};

/**
 * Pure function: given scores, return tier
 */
export const calculateTier = (scores: number[]): number => {
  if (!scores.length) return 3; // default tier
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 7) return 1; // mastered
  if (avg >= 4) return 2; // moderate
  return 3; // beginner
};

/**
 * Fetch trick consistencies, calculate overall tier,
 * and update the trick in DB.
 */
export const recalculateTrickTier = async (trickId: string) => {
  const { data: consistencies, error } = await supabase
    .from("trick_consistency")
    .select("score, landed")
    .eq("trick_id", trickId);

  if (error) {
    console.error("Failed to fetch consistencies:", error);
    return;
  }

  // Use only landed = true
  const validScores = consistencies?.filter(c => c.landed && c.score > 0) || [];

  if (validScores.length === 0) {
    console.log("No landed consistencies for trick:", trickId);
    return;
  }

  // Extract just scores
  const scores = validScores.map(c => c.score);

  // Use pure function
  const newTier = calculateTier(scores);

  // Update DB
  const { error: updateError } = await supabase
    .from("tricks")
    .update({ tier: newTier })
    .eq("id", trickId);

  if (updateError) {
    console.error("Failed to update trick tier:", updateError);
    return;
  }

  console.log(`Updated trick ${trickId} to tier ${newTier}`);
};

export function canUnlockNewTrick(user: User, tricks: Trick[]): boolean {
  if (!user || !tricks || tricks.length === 0) return false;
  console.log(tricks)

  // Rule 1: 70% of tricks are Tier 1
  const tier1Count = tricks.filter(t => t.tier === 1).length;
  const percentageTier1 = tier1Count / tricks.length;
  const meetsTierRule = percentageTier1 >= 0.7;

  return meetsTierRule;
}
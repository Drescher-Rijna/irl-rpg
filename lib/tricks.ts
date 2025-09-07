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

export const calculateTier = (scores: number[]): number => {
  if (!scores.length) return 3; // default tier
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;

  if (avg >= 7) return 1; // mastered
  if (avg >= 3) return 2; // moderate
  return 3; // beginner
};
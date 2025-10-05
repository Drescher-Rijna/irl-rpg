// lib/trick.ts
import { supabase } from '@/lib/supabase';
import type { User, Trick, Obstacle } from '@/types';

/**
 * Fetch tricks for a user and include obstacles + per-obstacle consistency scores.
 * Works with either `trick_obstacle_consistencies` (preferred) or `trick_consistency` (legacy).
 */
export async function fetchAllTricks(userId: string): Promise<Trick[]> {
  // 1) Fetch tricks and their linked obstacles
  const { data: tricksData, error: tricksError } = await supabase
    .from('tricks')
    .select(`
      id,
      name,
      stance,
      tier,
      trick_obstacles (
        id,
        obstacle_id,
        obstacles ( id, name, difficulty, obstacle_type_id )
      )
    `)
    .eq('user_id', userId);

  if (tricksError) {
    console.error('Error fetching tricks:', tricksError);
    return [];
  }
  if (!tricksData) return [];

  // 2) Fetch consistencies from canonical table; if empty try legacy name
  const { data: consistenciesA, error: consErrA } = await supabase
    .from('trick_obstacle_consistencies')
    .select('*')
    .eq('user_id', userId);

  let consistencyData = consistenciesA;
  if (consErrA || !consistenciesA) {
    // fallback for older schema
    const { data: consB } = await supabase
      .from('trick_consistency')
      .select('*')
      .eq('user_id', userId);
    consistencyData = consB || [];
  }

  // 3) Build map for quick lookup
  const consistencyMap: Record<string, any> = {};
  (consistencyData || []).forEach((c: any) => {
    // key by trick_obstacle OR trick+obstacle
    if (c.trick_obstacle_id) {
      consistencyMap[`to_${c.trick_obstacle_id}`] = c;
    } else {
      consistencyMap[`${c.trick_id}-${c.obstacle_id}`] = c;
    }
  });

  // 4) Build Trick[] with obstacles and per-obstacle score
  const tricks = (tricksData || []).map((t: any) => {
    const obstacles: Obstacle[] = (t.trick_obstacles || []).map((to: any) => {
      const byTo = consistencyMap[`to_${to.id}`];
      const byKey = consistencyMap[`${t.id}-${to.obstacle_id}`];
      const cons = byTo ?? byKey ?? null;

      return {
        id: to.obstacle_id,
        name: to.obstacles?.name,
        type: to.obstacles?.type,
        difficulty: to.obstacles?.difficulty,
        score: cons ? cons.score ?? 0 : 0,
        landed: cons ? !!cons.landed : false,
        trick_obstacle_id: to.id
      } as any;
    });

    // compute simple overall consistency average (only obstacles that have a score > 0)
    const scored = obstacles.filter(o => typeof o.score === 'number' && o.score > 0);
    const consistencyAvg =
      scored.length > 0 ? Math.round((scored.reduce((s, o) => s + (o.score || 0), 0) / scored.length) * 100) / 100 : 0;

    return {
      id: t.id,
      name: t.name,
      stance: t.stance,
      tier: t.tier,
      consistency: consistencyAvg,
      obstacles
    } as Trick;
  });

  return tricks;
}

/**
 * Pure: given scores (0–10) returns tier
 */
export const calculateTier = (scores: number[]): number => {
  if (!scores || scores.length === 0) return 3;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  if (avg >= 7) return 1;
  if (avg >= 4) return 2;
  return 3;
};

/**
 * Recalculate overall trick tier using only landed = true scores (and score > 0)
 */
export const recalculateTrickTier = async (trickId: string) => {
  // Try canonical table first
  const { data: consistencies, error } = await supabase
    .from('trick_obstacle_consistencies')
    .select('score, landed')
    .eq('trick_id', trickId);

  let rows = consistencies;
  if (error || !rows) {
    // fallback to legacy
    const { data: legacy } = await supabase
      .from('trick_consistency')
      .select('score, landed')
      .eq('trick_id', trickId);
    rows = legacy || [];
  }

  if (!rows || rows.length === 0) {
    console.debug('No consistency rows for trick:', trickId);
    return;
  }

  const valid = (rows || []).filter((r: any) => r.landed && typeof r.score === 'number' && r.score > 0);
  if (valid.length === 0) {
    // No landed scores yet — optionally set tier to 3 or keep existing
    console.debug('No landed scored rows for trick:', trickId);
    return;
  }

  const scores = valid.map((r: any) => r.score);
  const newTier = calculateTier(scores);

  const { error: updErr } = await supabase.from('tricks').update({ tier: newTier }).eq('id', trickId);
  if (updErr) console.error('Failed to update trick tier:', updErr);
  else console.log(`Updated trick ${trickId} -> tier ${newTier}`);
};

/**
 * Business rule: can unlock new trick without a wild slot
 * - allow free building until N tricks (e.g. 10)
 * - otherwise require 70% of existing tricks to be tier 1
 */
export function canUnlockNewTrick(user: User | null, tricks: Trick[] | null): boolean {
  if (!user) return false;
  if (!tricks) return false;

  // allow early growth
  if (tricks.length < 10) return true;

  const tier1 = tricks.filter(t => t.tier === 1).length;
  return tier1 / tricks.length >= 0.7;
}

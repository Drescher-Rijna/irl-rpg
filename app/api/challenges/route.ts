import { supabase } from '@/lib/supabase';
import { generateDailyChallenges, generateBossChallenge, generateComboChallenge, generateLineChallenge } from '@/lib/challenges';
import { NextResponse } from 'next/server';
import { Obstacle, Challenge, Trick } from '@/types';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    console.log(1)

    // 1️⃣ Fetch tricks with obstacles
const { data: tricksData, error: tricksError } = await supabase
  .from('tricks')
  .select(`
    id,
    name,
    tier,
    trick_obstacles (
      id,
      obstacle_id,
      obstacles (
        id,
        name,
        obstacle_type_id,
        difficulty
      )
    )
  `).eq('user_id', userId);

if (tricksError) throw tricksError;

const { data: consistencyData, error: consistencyError } = await supabase
  .from('trick_obstacle_consistencies')
  .select('trick_obstacle_id, score')
  .eq('user_id', userId);

if (consistencyError) throw consistencyError;

    const tricks = tricksData.map(trick => {
  const obstacles: Obstacle[] = trick.trick_obstacles?.map(to => {
    const obstacle = to.obstacles;
    const consistency = consistencyData.find(c => c.trick_obstacle_id === to.id);

    return {
      id: obstacle.id,
      name: obstacle.name,
      obstacle_type_id: obstacle.obstacle_type_id,
      difficulty: obstacle.difficulty,
      score: consistency?.score ?? 0,
    } as Obstacle;
  }) || [];

  const avgConsistency =
    obstacles.length > 0
      ? obstacles.reduce((sum, o) => sum + (o.score ?? 0), 0) / obstacles.length
      : 0;

  return {
    id: trick.id,
    name: trick.name,
    tier: trick.tier,
    consistency: avgConsistency,
    obstacles,
  } as Trick;
});

    // 4️⃣ Fetch existing challenges for user
    const { data: existing, error: existingError } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userId) as { data: Challenge[] | null; error: any };
    if (existingError) return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });

    // 5️⃣ Count current challenges
    const MAX_DAILY = 5;
    const MAX_LINE = 2;
    const MAX_COMBO = 2;
    const MAX_BOSS = 1;

    const dailyCount = existing?.filter(c => c.type === 'daily' && !c.completed).length ?? 0;
    const lineCount = existing?.filter(c => c.type === 'line' && !c.completed).length ?? 0;
    const comboCount = existing?.filter(c => c.type === 'combo' && !c.completed).length ?? 0;
    const bossCount = existing?.filter(c => c.type === 'boss' && !c.completed).length ?? 0;

    const newChallenges = [];

    // 6️⃣ Prepare existing trick IDs per type to prevent duplicates
    const today = new Date().toISOString().split('T')[0];
const existingDailyTrickIds: string[] = (existing
  ?.filter(c => c.type === 'daily' && !c.completed && c.created_at === today)
  .map(c => c.trick_id)
  .filter((id): id is string => !!id)) || [];    /* const existingLineTrickIds = existing
      .filter(c => c.type === 'line' && !c.completed)
      .map(c => c.trick_id);
    const existingComboTrickIds = existing
      .filter(c => c.type === 'combo' && !c.completed)
      .map(c => c.trick_id); */
const existingBossTrickIds: string[] = existing
  ?.filter(c => c.type === 'boss' && !c.completed)
  .map(c => c.trick_id)
  .filter((id): id is string => !!id) || [];
  
    // 7️⃣ Generate Daily Challenges
    if (dailyCount < MAX_DAILY) {
      const availableDaily = tricks.filter(t => !existingDailyTrickIds.includes(t.id));
      if (availableDaily.length > 0) {
        const dailyToGen = Math.min(MAX_DAILY - dailyCount, availableDaily.length);
        const daily = generateDailyChallenges(availableDaily, existingDailyTrickIds, dailyToGen);
        newChallenges.push(...daily);
      }
    }

    // 8️⃣ Generate Boss Challenges
    if (bossCount < MAX_BOSS) {
      const availableBoss = tricks.filter(t => !existingBossTrickIds.includes(t.id));
      if (availableBoss.length > 0) {
        const allObstaclesRes = await supabase.from('obstacles').select('*') as { data: Obstacle[] | null; error: any };
        const allObstacles = allObstaclesRes.data || [];
        const boss = await generateBossChallenge(availableBoss, existing ?? [], allObstacles);
        if (boss) newChallenges.push(boss);
      }
    }

    // 9️⃣ Generate Combo Challenges
    if (comboCount < MAX_COMBO && existing) {
      const combo = await generateComboChallenge(tricks, existing.filter(c => c.type === 'combo'));
      if (combo) newChallenges.push(combo);
    }

    // 🔟 Generate Line Challenges
    if (lineCount < MAX_LINE && existing) {
      const line = await generateLineChallenge(existing.filter(c => c.type === 'line'));
      if (line) newChallenges.push(line);
    }

    // 1️⃣1️⃣ Persist new challenges if any
  if (newChallenges.length > 0) {
    await supabase.from('challenges').insert(
      newChallenges.map(c => ({
        ...c,
        user_id: userId,
        trick_id: c.trick_id || null,        // convert empty string to null
        obstacle_id: c.obstacle_id || null,  // convert empty string to null
        completed: false,
        failed: false,
        created_at: new Date().toISOString().split('T')[0],
      }))
    );
}

    return NextResponse.json({ created: newChallenges.length, challenges: newChallenges });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    // Fetch challenges for user
    const { data: challenges, error: challengeError } = await supabase
      .from('challenges')
      .select(`
        id,
        name,
        description,
        type,
        xp_reward,
        difficulty,
        completed,
        failed,
        created_at,
        trick_id,
        obstacle_id,
        unlock_condition
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (challengeError) throw challengeError;

    if (!challenges || challenges.length === 0) {
      return NextResponse.json({ challenges: [] });
    }

    // Collect all trick and obstacle IDs to hydrate in bulk
    const trickIds = [...new Set(challenges.map(c => c.trick_id).filter(Boolean))];
    const obstacleIds = [...new Set(challenges.map(c => c.obstacle_id).filter(Boolean))];

    // Fetch tricks
    const { data: tricks, error: tricksError } = await supabase
      .from('tricks')
      .select('id, name, stance, tier');
    if (tricksError) throw tricksError;

    // Fetch obstacles
   const { data: obstacles, error: obstaclesError } = await supabase
    .from('obstacles')
    .select(`
      id,
      name,
      difficulty,
      obstacle_type_id,
      obstacle_types (
        id,
        name
      )
    `);
    if (obstaclesError) throw obstaclesError;

    // Merge into challenge objects
    const enriched = challenges.map(challenge => {
      const trick = tricks.find(t => t.id === challenge.trick_id);
      const obstacle = obstacles.find(o => o.id === challenge.obstacle_id);

      return {
        ...challenge,
        trick_name: trick?.name || null,
        obstacle_name: obstacle?.name || null,
        obstacle_type: obstacle?.obstacle_types?.name || null,
      };
    });

    return NextResponse.json({ challenges: enriched });
  } catch (err: any) {
    console.error('Error fetching challenges:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) return NextResponse.json({ error: 'Missing challenge ID' }, { status: 400 });

  try {
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Challenge deleted' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 });
  }
}
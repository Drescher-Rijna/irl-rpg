import { supabase } from '@/lib/supabase';
import { generateDailyChallenges, generateBossChallenge, generateComboChallenge, generateLineChallenge } from '@/lib/challenges';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // 1️⃣ Fetch tricks with obstacles
    const { data: tricksData, error: tricksError } = await supabase
      .from('tricks')
      .select(`
        id,
        name,
        tier,
        trick_obstacles (
          obstacle_id,
          obstacles (id, name, type, difficulty)
        )
      `);
    if (tricksError) throw tricksError;

    // 2️⃣ Fetch consistency separately
    const { data: consistencyData, error: consistencyError } = await supabase
      .from('trick_consistency')
      .select('trick_id, obstacle_id, score');
    if (consistencyError) throw consistencyError;

    // 3️⃣ Merge consistency into tricks
    const tricks = tricksData.map(trick => {
  const relatedConsistency = consistencyData.filter(c => c.trick_id === trick.id);
  const avgConsistency = relatedConsistency.length
    ? relatedConsistency.reduce((sum, c) => sum + c.score, 0) / relatedConsistency.length
    : 0;

  // Flatten obstacles from trick_obstacles
  const obstacles = trick.trick_obstacles?.map(to => ({
        id: to.obstacle_id,
        name: to.obstacles.name,
        type: to.obstacles.type,
        difficulty: to.obstacles.difficulty,
        consistency: relatedConsistency.find(c => c.obstacle_id === to.obstacle_id)?.score || 0,
      })) || [];

      return {
        id: trick.id,
        name: trick.name,
        tier: trick.tier,
        consistency: avgConsistency,
        obstacles,
      };
    });

    // 4️⃣ Fetch existing challenges for user
    const { data: existing, error: existingError } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userId);
    if (existingError) return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });

    // 5️⃣ Count current challenges
    const MAX_DAILY = 5;
    const MAX_LINE = 2;
    const MAX_COMBO = 2;
    const MAX_BOSS = 1;

    const dailyCount = existing.filter(c => c.type === 'daily' && !c.is_completed).length;
    const lineCount = existing.filter(c => c.type === 'line' && !c.is_completed).length;
    const comboCount = existing.filter(c => c.type === 'combo' && !c.is_completed).length;
    const bossCount = existing.filter(c => c.type === 'boss' && !c.is_completed).length;

    const newChallenges = [];

    // 6️⃣ Prepare existing trick IDs per type to prevent duplicates
    const today = new Date().toISOString().split('T')[0];
    const existingDailyTrickIds = existing
      .filter(c => c.type === 'daily' && !c.is_completed && c.date_assigned === today)
      .map(c => c.trick_id);
    /* const existingLineTrickIds = existing
      .filter(c => c.type === 'line' && !c.is_completed)
      .map(c => c.trick_id);
    const existingComboTrickIds = existing
      .filter(c => c.type === 'combo' && !c.is_completed)
      .map(c => c.trick_id); */
    const existingBossTrickIds = existing
      .filter(c => c.type === 'boss' && !c.is_completed)
      .map(c => c.trick_id);


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
        const boss = await generateBossChallenge(availableBoss, existing);
        if (boss) newChallenges.push(boss);
      }
    }

    // 9️⃣ Generate Combo Challenges
    if (comboCount < MAX_COMBO) {
      const combo = await generateComboChallenge(tricks, existing.filter(c => c.type === 'combo'));
      if (combo) newChallenges.push(combo);
    }

    // 🔟 Generate Line Challenges
    if (lineCount < MAX_LINE) {
      const line = await generateLineChallenge(tricks, existing.filter(c => c.type === 'line'));
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
        is_completed: false,
        failed: false,
        is_manual: false,
        date_assigned: new Date().toISOString().split('T')[0],
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
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .order('date_assigned', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ challenges: data });
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
import { supabase } from '@/lib/supabase';
import { generateDailyChallenges, generateBossChallenge, generateComboChallenge, generateLineChallenge } from '@/lib/challenges';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId } = body;
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

   // 1. Fetch tricks with obstacles
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

// 2. Fetch consistency separately
const { data: consistencyData, error: consistencyError } = await supabase
  .from('trick_consistency')
  .select('trick_id, obstacle_id, score');

if (consistencyError) throw consistencyError;

// 3. Merge into one array
const tricks = tricksData.map(trick => {
  const relatedConsistency = consistencyData.filter(c => c.trick_id === trick.id);
  const avgConsistency = relatedConsistency.length
    ? relatedConsistency.reduce((sum, c) => sum + c.score, 0) / relatedConsistency.length
    : 0;

  return {
    id: trick.id,
    name: trick.name,
    tier: trick.tier,
    consistency: avgConsistency,
  };
});

console.log('Fetched Tricks with consistency:', tricks);

    // 2️⃣ Fetch existing challenges
    const { data: existing, error: existingError } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userId);
    if (existingError) return NextResponse.json({ error: 'Failed to fetch challenges' }, { status: 500 });

    // 3️⃣ Determine how many challenges we can generate per type
    const MAX_DAILY = 5;
    const MAX_LINE = 2;
    const MAX_COMBO = 2;
    const MAX_BOSS = 1;

    const dailyCount = existing.filter(c => c.type === 'daily').length;
    const lineCount = existing.filter(c => c.type === 'line').length;
    const comboCount = existing.filter(c => c.type === 'combo').length;
    const bossCount = existing.filter(c => c.type === 'boss').length;

    const newChallenges = [];
console.log(dailyCount)
    // 4️⃣ Generate Daily Challenges
    if (dailyCount < MAX_DAILY) {
      console.log(1)
      const dailyToGen = MAX_DAILY - dailyCount;
      const daily = generateDailyChallenges(tricks, existing.map(c => c.trick_id), dailyToGen);
      newChallenges.push(...daily);
    }

    // 5️⃣ Generate Boss
    if (bossCount < MAX_BOSS) {
      console.log(2)
      const boss = await generateBossChallenge(tricks, existing);
      if (boss) newChallenges.push(boss);
    }

    // 6️⃣ Generate Combo
    if (comboCount < MAX_COMBO) {
      console.log(3)
      const combo = await generateComboChallenge(tricks, existing);
      if (combo) newChallenges.push(combo);
    }

    // 7️⃣ Generate Line
    if (lineCount < MAX_LINE) {
      console.log(4)
      const line = await generateLineChallenge(tricks, existing);
      if (line) newChallenges.push(line);
    }

    // 8️⃣ Persist challenges
    if (newChallenges.length > 0) {
      await supabase.from('challenges').insert(newChallenges.map(c => ({
        ...c,
        user_id: userId
      })));
    }

    return NextResponse.json({ created: newChallenges.length, challenges: newChallenges });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

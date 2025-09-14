// /api/challenges/route.ts
import { supabase } from '@/lib/supabase';
import { NextResponse } from 'next/server';
import { fetchAllTricks } from '@/lib/tricks';
import { generateDailyChallenges } from '@/lib/challenges';
import { v4 as uuidv4 } from 'uuid';

type ChallengeCategory = 'daily' | 'combo' | 'line' | 'boss';

const MAX_CHALLENGES = {
  daily: 5,
  combo: 2,
  line: 2,
  boss: 1
};

// XP scaling per tier
const XP_PER_TIER = [0, 50, 100, 150]; // index = tier

export async function POST(req: Request) {
  try {
    const { userId, generateType }: { userId: string; generateType?: ChallengeCategory } = await req.json();
    if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

    // Fetch user
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Fetch current challenges for the user
    const { data: existingChallenges } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_completed', false);

    // Check if daily generation already happened today
    const today = new Date().toISOString().slice(0, 10);
    const todaysDaily = existingChallenges?.filter(c => c.type === 'daily' && c.date_assigned === today) || [];
    
    const response: any = { generated: [] };

    // --- DAILY CHALLENGES ---
    if (!generateType || generateType === 'daily') {
      const dailyCount = existingChallenges?.filter(c => c.type === 'daily').length || 0;
      if (dailyCount < MAX_CHALLENGES.daily) {
        const tricks = await fetchAllTricks(); // all tricks with tier & consistency
        const completedTrickIds = []; // could also fetch user's completed tricks

        const dailyChallenges = generateDailyChallenges(tricks, completedTrickIds, MAX_CHALLENGES.daily - dailyCount);

        if (dailyChallenges.length) {
          const inserts = dailyChallenges.map(dc => ({
            id: uuidv4(),
            user_id: userId,
            type: 'daily',
            trick_id: dc.trick_id,
            name: dc.name,
            description: `Land ${dc.name} ${dc.tier === 1 ? 7 : dc.tier === 2 ? 5 : 3} out of 10 times`,
            tier: dc.tier,
            xp_reward: dc.xp_reward,
            is_manual: false,
            date_assigned: today
          }));

          await supabase.from('challenges').insert(inserts);
          response.generated.push(...inserts);
        }
      }
    }

    // --- COMBO, LINE, BOSS (manual or limited auto) ---
    const categories: ChallengeCategory[] = ['combo', 'line', 'boss'];
    for (const cat of categories) {
      if (!generateType || generateType === cat) {
        const count = existingChallenges?.filter(c => c.type === cat).length || 0;
        if (count < MAX_CHALLENGES[cat]) {
          // TODO: implement proper generation logic for combo/line/boss
          // For now we just stub a challenge
          const insert = {
            id: uuidv4(),
            user_id: userId,
            type: cat,
            name: `${cat.toUpperCase()} Challenge`,
            description: 'Complete this challenge',
            tier: 1,
            difficulty: 1,
            xp_reward: 100,
            is_manual: false,
            date_assigned: today
          };
          await supabase.from('challenges').insert([insert]);
          response.generated.push(insert);
        }
      }
    }

    return NextResponse.json(response);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate challenges' }, { status: 500 });
  }
}

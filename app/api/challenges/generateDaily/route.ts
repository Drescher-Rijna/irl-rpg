import { supabase } from '@/lib/supabase';
import { generateDailyChallenges } from '@/lib/challenges';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, tricks, completedTrickIds, skateCategoryId } = body;

    if (!userId || !tricks || !skateCategoryId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const dailyChallenges = generateDailyChallenges(tricks, completedTrickIds);

    await supabase.from('challenges').insert(
      dailyChallenges.map(dc => ({
        category_id: skateCategoryId,
        type: 'daily',
        name: dc.name,
        tier: dc.tier,
        xp_reward: dc.xp_reward,
        is_manual: false,
      }))
    );

    return NextResponse.json({ dailyChallenges });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to generate daily challenges' }, { status: 500 });
  }
}

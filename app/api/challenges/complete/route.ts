import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateXP, updateUserXP } from '@/lib/xp';

export async function POST(req: Request) {
  try {
    const { userId, challengeId } = await req.json();
    if (!userId || !challengeId) {
      return NextResponse.json({ error: 'Missing userId or challengeId' }, { status: 400 });
    }

    // 1️⃣ Fetch challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();
    if (challengeError || !challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (challenge.is_completed) return NextResponse.json({ error: 'Challenge already completed' }, { status: 400 });

    // 2️⃣ Mark challenge complete
    await supabase.from('challenges').update({ is_completed: true }).eq('id', challengeId);

    // 3️⃣ Update trick consistency (per obstacle)
    let newScore: number | null = null;

    if (challenge.unlock_condition.type === 'consistency' && challenge.unlock_condition.target) {
      newScore = challenge.unlock_condition.target;
    } else if (challenge.unlock_condition.attempts && challenge.unlock_condition.lands) {
      newScore = Math.floor((challenge.unlock_condition.lands / challenge.unlock_condition.attempts) * 10);
      if (newScore > 10) newScore = 10;
    }

    if (newScore !== null && challenge.trick_id && challenge.obstacle_id) {
      await supabase
        .from('trick_consistency')
        .upsert({
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          score: newScore,
          tier:
            newScore >= 7 ? 1 :
            newScore >= 4 ? 2 : 3,
        }, { onConflict: 'trick_id, obstacle_id' });

      // 🔄 Recalculate overall trick tier using only obstacles with score > 0
      const { data: consistencies } = await supabase
        .from('trick_consistency')
        .select('score')
        .eq('trick_id', challenge.trick_id);

      if (consistencies && consistencies.length > 0) {
        const validScores = consistencies.filter(c => c.score > 0).map(c => c.score);
        const avgScore = validScores.reduce((sum, s) => sum + s, 0) / validScores.length;

        const newTier =
          avgScore >= 7 ? 1 :
          avgScore >= 4 ? 2 : 3;

        await supabase
          .from('tricks')
          .update({ tier: newTier })
          .eq('id', challenge.trick_id);
      }
    }

    // 4️⃣ Update user XP
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const earnedXP = challenge.xp_reward || calculateXP(challenge.tier || 1, newScore || 1);
    const updatedUser = updateUserXP(user, earnedXP);

    await supabase
      .from('users')
      .update({
        xp_total: updatedUser.xp_total,
        xp_current: updatedUser.xp_current,
        level: updatedUser.level,
      })
      .eq('id', userId);

    return NextResponse.json({
      success: true,
      earnedXP,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

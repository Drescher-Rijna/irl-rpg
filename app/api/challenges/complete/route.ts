import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateXP } from '@/lib/xp';
import { recalculateTrickTier } from '@/lib/tricks';

export async function POST(req: Request) {
  try {
    const { userId, challengeId, landsCompleted, attempts } = await req.json();
    if (!userId || !challengeId) {
      return NextResponse.json({ error: 'Missing userId or challengeId' }, { status: 400 });
    }

    // 1️⃣ Fetch challenge
    const { data: challenge } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();

    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });
    if (challenge.is_completed) return NextResponse.json({ error: 'Challenge already completed' }, { status: 400 });

    let newScore: number | null = null;
    let earnedXP = 0;
    let failed = false;
    let bonusXP = 0;

    // 2️⃣ Handle per challenge type
    if (['daily', 'initial'].includes(challenge.type)) {
      if (landsCompleted != null && attempts != null && challenge.trick_id && challenge.obstacle_id) {
        const target = challenge.unlock_condition?.target ?? 5; // fallback if missing
        failed = landsCompleted < target; // mark failed if lands < target

        // Calculate score out of 10
        newScore = Math.floor((landsCompleted / attempts) * 10);
        if (newScore > 10) newScore = 10;

        // XP logic
        if (!failed) {
          earnedXP = challenge.xp_reward;
          if (landsCompleted > target) {
            bonusXP = Math.floor((landsCompleted - target) / attempts * challenge.xp_reward * 0.2); // small bonus
            earnedXP += bonusXP;
          }
        }

        // Update trick consistency
        await supabase
          .from('trick_consistency')
          .upsert({
            trick_id: challenge.trick_id,
            obstacle_id: challenge.obstacle_id,
            score: newScore,
            landed: landsCompleted > 0
          }, { onConflict: 'trick_id,obstacle_id' });

        // Log the attempt
        await supabase.from('trick_logs').insert({
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          attempts,
          landed: landsCompleted,
          score: newScore,
          date: new Date()
        });

        await recalculateTrickTier(challenge.trick_id);
      }
    } else if (challenge.type === 'boss') {
      // Boss logic
      await supabase
        .from('trick_consistency')
        .update({ landed: true })
        .eq('trick_id', challenge.trick_id)
        .eq('obstacle_id', challenge.obstacle_id);

      // Create initial assessment challenge in background
      await supabase.from('challenges').insert([{
        trick_id: challenge.trick_id,
        obstacle_id: challenge.obstacle_id,
        name: `Initial Assessment: ${challenge.trick_id}`,
        type: 'initial',
        description: `Land ${challenge.trick_id} on ${challenge.obstacle_id} as many times as you can out of 10`,
        xp_reward: 50,
        tier: 1,
        difficulty: 2,
        unlock_condition: { type: 'attempts', attempts: 10 }
      }]);

      earnedXP = challenge.xp_reward || calculateXP(challenge.tier || 1, 10);
    } else if (challenge.type === 'combo' || challenge.type === 'line') {
      // Combo/line handled on frontend/modal
      earnedXP = challenge.xp_reward;
    }

    // 3️⃣ Mark challenge completed and set failed if applicable
    await supabase.from('challenges').update({ is_completed: true, failed }).eq('id', challengeId);

    // 4️⃣ Fetch user for frontend modal
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 5️⃣ Determine projected XP, level, and wild slot
    const currentLevel = user.level;
    const xpPerLevel = 100; // or dynamic formula
    const projectedTotalXP = user.xp_current + earnedXP;
    const projectedLevel = Math.floor(projectedTotalXP / xpPerLevel) + 1;
    const willGetWildSlot = projectedLevel > currentLevel && projectedLevel % 10 === 0; // wild slot every 10 levels

    // 6️⃣ Return info for frontend modal
    return NextResponse.json({
      success: true,
      challengeId,
      earnedXP,
      bonusXP,
      failed,
      user: {
        id: user.id,
        currentXP: user.xp_current,
        totalXP: user.xp_total,
        level: user.level,
      },
      projectedXP: projectedTotalXP,
      projectedLevel,
      willGetWildSlot
    });

  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

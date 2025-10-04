import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateXP, xpForLevel } from '@/lib/xp';
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
        const target = challenge.unlock_condition?.target ?? 5;
        failed = landsCompleted < target;

        // Score 0–10
        newScore = Math.floor((landsCompleted / attempts) * 10);
        if (newScore > 10) newScore = 10;

        // XP logic
        if (!failed) {
          earnedXP = challenge.xp_reward;
          if (landsCompleted > target) {
            bonusXP = Math.floor(((landsCompleted - target) / attempts) * challenge.xp_reward * 0.2);
            earnedXP += bonusXP;
          }
        }

        // Ensure trick_obstacle exists
        await supabase.from('trick_obstacles').upsert(
          {
            trick_id: challenge.trick_id,
            obstacle_id: challenge.obstacle_id,
          },
          { onConflict: 'trick_id,obstacle_id' }
        );

        // Update trick consistency
        await supabase.from('trick_consistency').upsert(
          {
            trick_id: challenge.trick_id,
            obstacle_id: challenge.obstacle_id,
            score: newScore,
            landed: landsCompleted > 0,
          },
          { onConflict: 'trick_id,obstacle_id' }
        );

        // Log the attempt
        await supabase.from('trick_logs').insert({
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          attempts,
          landed: landsCompleted,
          score: newScore,
          date: new Date(),
        });

        await recalculateTrickTier(challenge.trick_id);
      }
    } 
    else if (challenge.type === 'boss') {
      // ✅ Boss confirms trick–obstacle exists
      await supabase.from('trick_obstacles').upsert(
        {
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
        },
        { onConflict: 'trick_id,obstacle_id' }
      );

      // Start with a baseline consistency (landed once)
      await supabase.from('trick_consistency').upsert(
        {
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          score: 1,
          landed: true,
        },
        { onConflict: 'trick_id,obstacle_id' }
      );

      // Spawn the initial assessment challenge
      await supabase.from('challenges').insert([
        {
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          name: `Initial Assessment: ${challenge.trick_id}`,
          type: 'initial',
          description: `Land ${challenge.trick_id} on ${challenge.obstacle_id} as many times as you can out of 10`,
          xp_reward: 50,
          tier: 1,
          difficulty: 2,
          unlock_condition: { type: 'attempts', attempts: 10 },
          user_id: userId,
          is_completed: false,
          failed: false,
          date_assigned: new Date().toISOString().split('T')[0],
        },
      ]);

      earnedXP = challenge.xp_reward || calculateXP(challenge.tier || 1, 10);
    } 
    else if (['combo', 'line'].includes(challenge.type)) {
      // Combo/line just grant XP and optionally log attempts
      earnedXP = challenge.xp_reward;

      if (challenge.trick_id && challenge.obstacle_id) {
        await supabase.from('trick_logs').insert({
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          attempts: attempts ?? 0,
          landed: landsCompleted ?? 0,
          score: landsCompleted && attempts ? Math.floor((landsCompleted / attempts) * 10) : null,
          date: new Date(),
        });
      }
    }

    // 3️⃣ Mark challenge completed
    await supabase.from('challenges').update({ is_completed: true, failed }).eq('id', challengeId);

    // 4️⃣ Fetch user
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 5️⃣ Calculate XP progression dynamically
    let projectedLevel = user.level;
    let projectedXPInLevel = user.xp_current + earnedXP + bonusXP;
    let xpNeeded = xpForLevel(projectedLevel);

    while (projectedXPInLevel >= xpNeeded) {
      projectedXPInLevel -= xpNeeded;
      projectedLevel++;
      xpNeeded = xpForLevel(projectedLevel);
    }

    const willGetWildSlot = projectedLevel > user.level && projectedLevel % 10 === 0;

    return NextResponse.json({
      success: true,
      challengeId,
      earnedXP,
      bonusXP,
      failed,
      currentLevel: user.level,
      currentXP: user.xp_current,    
      projectedLevel,                
      projectedXP: projectedXPInLevel,
      wildSlotAwarded: willGetWildSlot,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

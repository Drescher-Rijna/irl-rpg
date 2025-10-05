import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { calculateXP, xpForLevel } from '@/lib/xp';
import { recalculateTrickTier } from '@/lib/tricks';

export async function POST(req: Request) {
  try {
    const { userId, challengeId, landsCompleted, attempts, trickData } = await req.json();
    if (!userId || !challengeId)
      return NextResponse.json({ error: 'Missing userId or challengeId' }, { status: 400 });

    // 1️⃣ Fetch challenge
    const { data: challenge, error: challengeError } = await supabase
      .from('challenges')
      .select('*')
      .eq('id', challengeId)
      .single();
    if (challengeError || !challenge)
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 });

    if (challenge.completed)
      return NextResponse.json({ error: 'Challenge already completed' }, { status: 400 });

    let earnedXP = 0;
    let bonusXP = 0;
    let failed = false;
    let newScore: number | null = null;

    // 2️⃣ Handle each challenge type
    if (['daily', 'initial'].includes(challenge.type)) {
      if (landsCompleted != null && attempts != null && challenge.trick_id && challenge.obstacle_id) {
        const target = challenge.unlock_condition?.target ?? 5;
        failed = challenge.type === 'daily' ? landsCompleted < target : false;

        // Score (0–10)
        newScore = Math.min(Math.floor((landsCompleted / attempts) * 10), 10);

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
            user_id: userId,
            trick_id: challenge.trick_id,
            obstacle_id: challenge.obstacle_id,
          },
          { onConflict: 'trick_id,obstacle_id' }
        );

        // Fetch trick_obstacle_id
        const { data: toData, error: toError } = await supabase
          .from('trick_obstacles')
          .select('id')
          .eq('trick_id', challenge.trick_id)
          .eq('obstacle_id', challenge.obstacle_id)
          .eq('user_id', userId)
          .single();

          console.log(toData, toError);

        if (toError || !toData) {
          console.error('Failed to fetch trick_obstacle_id:', toError);
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }

        // Update trick_obstacle_consistency
        await supabase.from('trick_obstacle_consistencies').upsert(
          {
            trick_obstacle_id: toData.id,
            user_id: userId,
            score: newScore,
          }
        );
        
        // Log attempt
        await supabase.from('trick_consistency_logs').insert({
          trick_id: challenge.trick_id,
          obstacle_id: challenge.obstacle_id,
          user_id: userId,
          score: newScore,
        });

        await recalculateTrickTier(challenge.trick_id);
      }
    }

    // 🧩 Boss Challenge
    else if (challenge.type === 'boss' && challenge.trick_id) {
      const harderObstacleId = challenge.unlock_condition?.obstacle_id;
      if (!harderObstacleId) {
        return NextResponse.json({ error: 'Invalid challenge configuration' }, { status: 500 });
      }

      const { data: nextObstacle } = await supabase
        .from('obstacles')
        .select('id, name, difficulty')
        .eq('id', harderObstacleId);

      if (nextObstacle) {
        // Create new trick_obstacle
        const { data: trickObs } = await supabase
          .from('trick_obstacles')
          .upsert(
            { user_id: userId, trick_id: challenge.trick_id, obstacle_id: nextObstacle.id },
            { onConflict: 'trick_id,obstacle_id' }
          )
          .select('id')
          .single();

        // Add consistency
        if (trickObs?.id) {
          await supabase.from('trick_obstacle_consistencies').upsert(
            {
              trick_obstacle_id: trickObs.id,
              user_id: userId,
              score: 1,
            }
          );
        }
      }

      // log trick_obstacle_consistency with score 1
      await supabase.from('trick_consistency_logs').insert({
        trick_id: challenge.trick_id,
        obstacle_id: harderObstacleId,
        user_id: userId,
        score: 1,
      });

      earnedXP = challenge.xp_reward || calculateXP(challenge.difficulty || 1, 10);
    }

    // 🔗 Combo Challenge
    else if (challenge.type === 'combo' && challenge.unlock_condition?.tricks && trickData) {
  // trickData comes from the modal: name, stance, obstacleTypeIds, landedType, landedObstacleId

  // 1️⃣ Loop through the tricks in the combo
  const comboTricks: string[] = challenge.unlock_condition.tricks;

  // 2️⃣ Create the new trick if it doesn't exist
  let { data: trick, error: trickError } = await supabase
    .from('tricks')
    .insert([{
      name: trickData.name,
      stance: trickData.stance,
      user_id: userId,
      combo: true,
      trick_ids_in_combo: comboTricks.map(id => parseInt(id)), // optional, stores IDs of component tricks
      obstacle_type_ids: trickData.obstacleTypeIds
    }])
    .select('id')
    .single();

  if (trickError || !trick) {
    console.error('Failed to create combo trick:', trickError);
    throw new Error('Failed to create combo trick');
  }

  for (const trickId of comboTricks) {
    if (!challenge.obstacle_id) continue;

    // Upsert trick_obstacle for each trick in combo
    const { data: trickObs, error: toError } = await supabase
      .from('trick_obstacles')
      .upsert(
        { user_id: userId, trick_id: trickId, obstacle_id: challenge.obstacle_id },
        { onConflict: 'trick_id,obstacle_id' }
      )
      .select('id')
      .single();

    if (toError || !trickObs) {
      console.error('Failed upserting trick_obstacle:', toError);
      continue; // skip this trick but continue the loop
    }

    // Upsert trick_obstacle_consistency
    await supabase.from('trick_obstacle_consistencies').upsert({
      trick_obstacle_id: trickObs.id,
      user_id: userId,
      score: 2
    }, { onConflict: 'trick_obstacle_id,user_id' });

    // Insert a consistency log
    await supabase.from('trick_consistency_logs').insert({
      trick_id: trickId,
      obstacle_id: challenge.obstacle_id,
      user_id: userId,
      score: 2
    });
  }

  // 3️⃣ Calculate earned XP
  earnedXP = challenge.xp_reward ?? calculateXP(challenge.difficulty || 2, 20);
}

    // 🧠 Line Challenge
    else if (challenge.type === 'line') {
      earnedXP = challenge.xp_reward || 75;
    }

    // 3️⃣ Mark challenge completed
    await supabase.from('challenges').update({ completed: true, failed }).eq('id', challengeId);

    // 4️⃣ Fetch user
    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 5️⃣ Calculate XP progression
    let projectedLevel = user.level;
    let projectedXPInLevel = user.xp_current + earnedXP + bonusXP;
    let xpNeeded = xpForLevel(projectedLevel);

    while (projectedXPInLevel >= xpNeeded) {
      projectedXPInLevel -= xpNeeded;
      projectedLevel++;
      xpNeeded = xpForLevel(projectedLevel);
    }

    const wildSlotAwarded = projectedLevel > user.level && projectedLevel % 10 === 0;

    // ✅ Return summary
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
      wildSlotAwarded,
    });
  } catch (err) {
    console.error('Challenge completion error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

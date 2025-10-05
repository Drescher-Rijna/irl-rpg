// app/api/tricks/create/route.ts
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(req: Request) {
  try {
    const { name, stance, userId, obstacle_type_ids, landed_type, landedObstacleId } = await req.json();
   
    if (!name || !stance || !userId || !Array.isArray(obstacle_type_ids) || obstacle_type_ids.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Insert trick
    const { data: trick, error: trickError } = await supabase
      .from('tricks')
      .insert([{ name, stance, user_id: userId, obstacle_type_ids }])
      .select('id')
      .single();

    if (trickError) throw trickError;

    // 2. If trick was created via modal (landed obstacle provided)
    if (landed_type && landedObstacleId) {
      // Insert trick_obstacle for landed
      await supabase.from('trick_obstacles').insert([{
        trick_id: trick.id,
        obstacle_id: landedObstacleId,
        type: landed_type,
        user_id: userId,
      }]);

      // Insert consistency row
      await supabase.from('trick_consistency').insert([{
        trick_id: trick.id,
        obstacle_id: landedObstacleId,
        landed: true,
        score: 0,
        user_id: userId,
      }]);

      // Get landed obstacle name and difficulty
      let { data: landedObstacle, error: landedObstacleError } = await supabase
        .from('obstacles')
        .select('id, name, difficulty')
        .eq('id', landedObstacleId)
        .single();

      // Create initial assessment challenge
      await supabase.from('challenges').insert([{
        trick_id: trick.id,
        obstacle_id: landedObstacleId,
        name: `Initial Assessment: ${name}`,
        description: `Land ${name} on ${landedObstacle?.name} as many times as you can out of 10 attempts`,
        type: 'initial',
        tier: 1,
        difficulty: landedObstacle?.difficulty || 1,
        xp_reward: 50,
        unlock_condition: { type: 'attempts', attempts: 10, lands: null },
        user_id: userId,
      }]);
    } else {
      // Step 1: Get the flat obstacle type ID
      let { data: flatTypeData, error: flatTypeError } = await supabase
        .from('obstacle_types')
        .select('id')
        .eq('key', 'flat')
        .single();

      if (flatTypeError) throw flatTypeError;

      const flatTypeId = flatTypeData?.id;

      // Step 2: Fetch all obstacles in the selected types
      let { data: obstacles, error: obstacleError } = await supabase
        .from('obstacles')
        .select('id, name, difficulty, obstacle_type_id')
        .in('obstacle_type_id', obstacle_type_ids); // Do NOT use .single()

      if (obstacleError) throw obstacleError;

      if (!obstacles || obstacles.length === 0) {
        return NextResponse.json(
          { error: 'No suitable obstacle found for initial challenge' },
          { status: 400 }
        );
      }

      // Step 3: Prioritize flat obstacles, then lowest difficulty
      let initialObstacle = obstacles
        .sort((a, b) => {
          if (a.obstacle_type_id === flatTypeId && b.obstacle_type_id !== flatTypeId) return -1;
          if (a.obstacle_type_id !== flatTypeId && b.obstacle_type_id === flatTypeId) return 1;
          return a.difficulty - b.difficulty;
        })[0];

      // Step 4: Insert new initial challenge for the trick
      let { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .insert([{
          trick_id: trick.id,
          obstacle_id: initialObstacle.id,
          name: `Initial Assessment: ${name}`,
          description: `Land ${name} on ${initialObstacle.name} as many times as you can out of 10 attempts`,
          type: 'initial',
          difficulty: initialObstacle.difficulty || 1,
          xp_reward: 50,
          unlock_condition: { type: 'attempts', attempts: 10, lands: null },
          user_id: userId,
        }]);

      if (challengeError) {
        console.error('Insert error:', challengeError);
      } else {
        console.log('Inserted challenge:', challengeData);
      }

    }

    return NextResponse.json({ success: true, trickId: trick.id });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}

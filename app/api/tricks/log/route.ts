import { supabase } from '@/lib/supabase';
import { calculateTier } from '@/lib/tricks';
import { calculateXP, updateUserXP } from '@/lib/xp';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { userId, trickId, obstacleIds, obstacleScores, attempts, landed, consistency } = body;

    if (!userId || !trickId || !obstacleIds || !obstacleScores || attempts === undefined || landed === undefined || consistency === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1️⃣ Update trick tier based on average obstacle scores
    const newTier = calculateTier(obstacleScores);
    await supabase.from('tricks').update({ tier: newTier }).eq('id', trickId);

    // 2️⃣ Log the trick attempt for each obstacle
    const logInserts = obstacleIds.map((obstacle_id: string, idx: number) => ({
      trick_id: trickId,
      obstacle_id,
      attempts,
      landed: Math.round((landed / attempts) * 10), // scaled to 0-10
    }));
    await supabase.from('trick_logs').insert(logInserts);

    // 3️⃣ Update user XP & level
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const earnedXP = calculateXP(newTier, consistency);
    const updatedUser = updateUserXP(user, earnedXP);

    await supabase
      .from('users')
      .update({ xp_total: updatedUser.xp_total, level: updatedUser.level })
      .eq('id', userId);

    return NextResponse.json({
      trickTier: newTier,
      earnedXP,
      user: updatedUser,
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

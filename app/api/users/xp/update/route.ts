import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { updateUserXP } from '@/lib/xp';

export async function POST(req: Request) {
  try {
    const { userId, earnedXP } = await req.json();
    if (!userId || earnedXP == null) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // 1️⃣ Fetch user
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // 2️⃣ Calculate new XP and projected level
    const updatedUser = updateUserXP(user, earnedXP);

    // Determine if wild slot should be awarded (every 10 levels)
    const previousLevel = user.level;
    const wildSlotAwarded = updatedUser.level > previousLevel && updatedUser.level % 10 === 0;

    // 3️⃣ Update user in database
    await supabase
      .from('users')
      .update({
        xp_total: updatedUser.xp_total,
        xp_current: updatedUser.xp_current,
        level: updatedUser.level
      })
      .eq('id', userId);

    // 4️⃣ If wild slot awarded, insert into wild_slots table
    if (wildSlotAwarded) {
      await supabase
        .from('wild_slots')
        .insert({ user_id: userId, created_at: new Date() });
    }

    return NextResponse.json({
      success: true,
      user: updatedUser,
      wildSlotAwarded
    });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

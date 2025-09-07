import { supabase } from '@/lib/supabase';
import { calculateXP, updateUserXP } from '@/lib/xp';

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { userId, challengeId } = req.body;

  try {
    const { data: challenge } = await supabase.from('challenges').select('*').eq('id', challengeId).single();
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });

    if (challenge.is_completed) return res.status(400).json({ error: 'Already completed' });

    await supabase.from('challenges').update({ is_completed: true }).eq('id', challengeId);

    const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();

    const earnedXP = challenge.xp_reward;
    const updatedUser = updateUserXP(user, earnedXP);

    await supabase.from('users').update({ xp_total: updatedUser.xp_total, level: updatedUser.level }).eq('id', userId);

    res.status(200).json({ earnedXP, user: updatedUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Something went wrong' });
  }
}

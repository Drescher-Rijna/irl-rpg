import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json({ error: 'Missing userId' }, { status: 400 });

  const { data, error } = await supabase
    .from('challenges')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ challenges: data });
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const { id } = params;

  if (!id) return NextResponse.json({ error: 'Missing challenge ID' }, { status: 400 });

  try {
    const { error } = await supabase.from('challenges').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ message: 'Challenge deleted' });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to delete challenge' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { taskId } = await req.json();
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

  const { error } = await supabaseAdmin
    .from('generated_videos')
    .delete()
    .eq('task_id', taskId)
    .eq('clerk_id', userId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

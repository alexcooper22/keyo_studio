import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as jose from 'jose';
import { supabaseAdmin } from '../../../lib/supabase';

async function generateKlingToken(): Promise<string> {
  const accessKeyId = process.env.KLING_ACCESS_KEY_ID!;
  const accessKeySecret = process.env.KLING_ACCESS_KEY_SECRET!;
  const secret = new TextEncoder().encode(accessKeySecret);
  const token = await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setNotBefore('-5s')
    .setExpirationTime('30m')
    .setIssuer(accessKeyId)
    .sign(secret);
  return token;
}

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const taskId = req.nextUrl.searchParams.get('taskId');
  if (!taskId) return NextResponse.json({ error: 'taskId required' }, { status: 400 });

  try {
    const token = await generateKlingToken();

    const response = await fetch(`https://api.klingai.com/v1/videos/text2video/${taskId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data }, { status: response.status });

    const task = data.data;
    const status = task?.task_status;
    const videoUrl = task?.task_result?.videos?.[0]?.url ?? null;

    if (status === 'succeed' && videoUrl) {
      await supabaseAdmin
        .from('generated_videos')
        .update({ status: 'succeed', video_url: videoUrl })
        .eq('task_id', taskId);
    } else if (status === 'failed') {
      await supabaseAdmin
        .from('generated_videos')
        .update({ status: 'failed' })
        .eq('task_id', taskId);
    }

    return NextResponse.json({
      status,
      videoUrl,
      duration: task?.task_result?.videos?.[0]?.duration ?? null,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 });
  }
}

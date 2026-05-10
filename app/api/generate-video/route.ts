import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as jose from 'jose';
import { supabaseAdmin } from '../../../lib/supabase';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

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

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt, duration = 5, aspectRatio = '9:16', mode = 'std', quality = '720p', audio = false, startFrame = null, endFrame = null } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

  try {
    const token = await generateKlingToken();

    const endpoint = startFrame || endFrame ? 'image2video' : 'text2video';
    const response = await fetch(`https://api.klingai.com/v1/videos/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        model_name: 'kling-v3',
        prompt,
        duration,
        aspect_ratio: aspectRatio,
        mode,
        cfg_scale: quality === '1080p' ? 0.5 : undefined,
        enable_audio: audio,
        ...(startFrame && { image: startFrame }),
        ...(endFrame && { image_tail: endFrame }),
      }),
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: data }, { status: response.status });

    const taskId = data.data?.task_id;

    // Save task to Supabase
    if (taskId) {
      await supabaseAdmin.from('generated_videos').insert({
        clerk_id: userId,
        prompt,
        task_id: taskId,
        duration,
        aspect_ratio: aspectRatio,
        mode,
        status: 'processing'
      });
    }

    return NextResponse.json({ taskId });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
}

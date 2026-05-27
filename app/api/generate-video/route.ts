import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as jose from 'jose';
import { supabaseAdmin } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';

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

  const { allowed } = rateLimit(`gen-video:${userId}`, 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });

  const { prompt, duration = 5, aspectRatio = '9:16', mode = 'std', quality = '720p', audio = false, startFrame = null, endFrame = null } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

  // Calculate credit cost
  const baseCostPerSec = quality === '1080p' ? 4 : 3;
  const audioCostPerSec = audio ? 1 : 0;
  const creditCost = (baseCostPerSec + audioCostPerSec) * duration;

  // Check subscription and credits
  const { data: subscription, error: subError } = await supabaseAdmin
    .from('user_subscriptions')
    .select('credits_remaining, status')
    .eq('clerk_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: 'Failed to check subscription' }, { status: 500 });
  }

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription. Please choose a plan.' }, { status: 403 });
  }

  if (subscription.credits_remaining < creditCost) {
    return NextResponse.json({ error: `Not enough credits. This video requires ${creditCost} credits.` }, { status: 403 });
  }

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

    // Save task and deduct credits
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

      // Deduct credits atomically — .gte guard prevents overdraft in race conditions
      const { data: updatedSub } = await supabaseAdmin
        .from('user_subscriptions')
        .update({
          credits_remaining: subscription.credits_remaining - creditCost,
          updated_at: new Date().toISOString()
        })
        .eq('clerk_id', userId)
        .eq('status', 'active')
        .gte('credits_remaining', creditCost)
        .select('credits_remaining')
        .maybeSingle();

      if (!updatedSub) {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });
      }
    }

    return NextResponse.json({ taskId, remainingCredits: subscription.credits_remaining - creditCost });
  } catch {
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
}

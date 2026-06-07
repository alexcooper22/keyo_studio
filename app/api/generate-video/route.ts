import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as jose from 'jose';
import { supabaseAdmin } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';
import { getModelById, getCreditCost, resolveApiKey } from '../../../lib/models'

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

  const { prompt, duration = 5, aspectRatio = '9:16', mode = 'std', quality = '720p', audio = false, startFrame = null, endFrame = null, modelId } = await req.json();
  if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });
  if (!modelId) return NextResponse.json({ error: 'modelId is required' }, { status: 400 });

  let aiModel: Awaited<ReturnType<typeof getModelById>>;
  let perSecond: number;
  try {
    aiModel = await getModelById(modelId);
    perSecond = await getCreditCost(aiModel.id, quality);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const audioCostPerSec = audio ? 1 : 0;
  const creditCost = (perSecond + audioCostPerSec) * duration;

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

  let apiKey: string | undefined;
  if (aiModel.provider === 'bytedance') {
    ({ apiKey } = resolveApiKey(aiModel));
  }

  try {
    let taskId: string | null = null;

    if (aiModel.provider === 'kling') {
      const token = await generateKlingToken();
      const endpoint = startFrame || endFrame ? 'image2video' : 'text2video';
      const response = await fetch(`https://api.klingai.com/v1/videos/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          model_name: aiModel.model_id,
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
      taskId = data.data?.task_id;

    } else if (aiModel.provider === 'bytedance') {
      const response = await fetch('https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: aiModel.model_id,
          content: [{ type: 'text', text: prompt }],
          ratio: aspectRatio,
          resolution: quality,
          duration,
          generate_audio: audio,
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: data?.message ?? 'ByteDance error' }, { status: response.status });
      taskId = data.id ?? data.task_id ?? null;

    } else {
      return NextResponse.json({ error: `Provider "${aiModel.provider}" not yet implemented for video` }, { status: 501 });
    }

    if (taskId) {
      await supabaseAdmin.from('generated_videos').insert({
        clerk_id: userId,
        prompt,
        task_id: taskId,
        duration,
        aspect_ratio: aspectRatio,
        mode,
        model: aiModel.name,
        provider: aiModel.provider,
        status: 'processing',
      });

      const { data: updatedSub } = await supabaseAdmin
        .from('user_subscriptions')
        .update({ credits_remaining: subscription.credits_remaining - creditCost, updated_at: new Date().toISOString() })
        .eq('clerk_id', userId)
        .eq('status', 'active')
        .gte('credits_remaining', creditCost)
        .select('credits_remaining')
        .maybeSingle();

      if (!updatedSub) return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });
    }

    return NextResponse.json({ taskId, remainingCredits: subscription.credits_remaining - creditCost });
  } catch {
    return NextResponse.json({ error: 'Failed to generate video' }, { status: 500 });
  }
}

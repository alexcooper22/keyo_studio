import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import * as jose from 'jose';
import { supabaseAdmin } from '../../../lib/supabase';
import { rateLimit } from '../../../lib/rateLimit';
import { getModelById, getCreditCost } from '../../../lib/models';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

async function generateKlingToken(): Promise<string> {
  const accessKeyId = process.env.KLING_ACCESS_KEY_ID!;
  const accessKeySecret = process.env.KLING_ACCESS_KEY_SECRET!;
  const secret = new TextEncoder().encode(accessKeySecret);
  return await new jose.SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuedAt()
    .setNotBefore('-5s')
    .setExpirationTime('30m')
    .setIssuer(accessKeyId)
    .sign(secret);
}

const FIXED_DURATION = 5;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { allowed } = rateLimit(`gen-mc:${userId}`, 5, 60_000);
  if (!allowed) return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });

  let characterImageUrl: string, motionVideoUrl: string, modelId: string;
  let characterOrientation = 'image', quality = '720p', prompt = '';
  try {
    const body = await req.json();
    characterImageUrl = body.characterImageUrl;
    motionVideoUrl = body.motionVideoUrl;
    characterOrientation = body.characterOrientation ?? 'image';
    quality = body.quality ?? '720p';
    modelId = body.modelId;
    prompt = body.prompt ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!characterImageUrl) return NextResponse.json({ error: 'characterImageUrl required' }, { status: 400 });
  if (!motionVideoUrl) return NextResponse.json({ error: 'motionVideoUrl required' }, { status: 400 });
  if (!modelId) return NextResponse.json({ error: 'modelId required' }, { status: 400 });
  if (!['image', 'video'].includes(characterOrientation)) {
    return NextResponse.json({ error: 'characterOrientation must be "image" or "video"' }, { status: 400 });
  }

  let aiModel: Awaited<ReturnType<typeof getModelById>>;
  let perSecond: number;
  try {
    aiModel = await getModelById(modelId);
    perSecond = await getCreditCost(aiModel.id, quality);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  const creditCost = perSecond * FIXED_DURATION;

  const { data: subscription } = await supabaseAdmin
    .from('user_subscriptions')
    .select('credits_remaining, status')
    .eq('clerk_id', userId)
    .eq('status', 'active')
    .maybeSingle();

  if (!subscription) {
    return NextResponse.json({ error: 'No active subscription. Please choose a plan.' }, { status: 403 });
  }
  if (subscription.credits_remaining < creditCost) {
    return NextResponse.json({ error: `Not enough credits. This requires ${creditCost} credits.` }, { status: 403 });
  }

  try {
    const token = await generateKlingToken();
    const klingBody: Record<string, unknown> = {
      model_name: aiModel.model_id,
      image_url: characterImageUrl,
      video_url: motionVideoUrl,
      character_orientation: characterOrientation,
    };
    if (prompt) klingBody.prompt = prompt;

    const response = await fetch('https://api.klingai.com/v1/videos/motion-control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(klingBody),
      signal: AbortSignal.timeout(30_000),
    });
    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json({ error: data?.message ?? `Kling error ${response.status}` }, { status: response.status });
    }

    const taskId = data.data?.task_id;
    if (!taskId) return NextResponse.json({ error: 'No task_id returned from Kling' }, { status: 500 });

    await supabaseAdmin.from('generated_videos').insert({
      clerk_id: userId,
      prompt: prompt || 'Motion Control',
      task_id: taskId,
      model: aiModel.name,
      provider: 'kling',
      task_type: 'motion-control',
      quality,
      status: 'processing',
    });

    const { data: updatedSub } = await supabaseAdmin
      .from('user_subscriptions')
      .update({
        credits_remaining: subscription.credits_remaining - creditCost,
        updated_at: new Date().toISOString(),
      })
      .eq('clerk_id', userId)
      .eq('status', 'active')
      .gte('credits_remaining', creditCost)
      .select('credits_remaining')
      .maybeSingle();

    if (!updatedSub) return NextResponse.json({ error: 'Insufficient credits' }, { status: 403 });

    return NextResponse.json({ taskId, remainingCredits: updatedSub.credits_remaining });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Internal error' }, { status: 500 });
  }
}

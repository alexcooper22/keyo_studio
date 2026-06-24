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

  // Validate taskId format — alphanumeric + hyphens/underscores, up to 128 chars
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(taskId)) {
    return NextResponse.json({ error: 'Invalid taskId' }, { status: 400 });
  }

  // Look up provider from DB
  const { data: videoRecord } = await supabaseAdmin
    .from('generated_videos')
    .select('provider, task_type, model_api_id')
    .eq('task_id', taskId)
    .maybeSingle();

  const provider = videoRecord?.provider ?? 'kling';
  const taskType = videoRecord?.task_type ?? 'text2video';

  try {
    if (provider === 'google') {
      const googleApiKey = process.env.GOOGLE_AI_API_KEY;
      if (!googleApiKey) return NextResponse.json({ error: 'Google API key not configured' }, { status: 500 });
      const modelApiId = videoRecord?.model_api_id ?? 'veo-3.1-generate-preview';
      const operationPath = `models/${modelApiId}/operations/${taskId}`;
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${operationPath}?key=${googleApiKey}`,
        { signal: AbortSignal.timeout(15_000) }
      );
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: 'Failed to check video status' }, { status: 502 });
      if (data.done) {
        const videoUrl = data.response?.generatedSamples?.[0]?.video?.uri ?? null;
        if (videoUrl) {
          await supabaseAdmin.from('generated_videos').update({ status: 'succeed', video_url: videoUrl }).eq('task_id', taskId);
          return NextResponse.json({ status: 'succeed', videoUrl, duration: null });
        }
        await supabaseAdmin.from('generated_videos').update({ status: 'failed' }).eq('task_id', taskId);
        return NextResponse.json({ status: 'failed', videoUrl: null, duration: null });
      }
      return NextResponse.json({ status: 'processing', videoUrl: null, duration: null });
    }

    if (provider === 'alibaba') {
      const alibabaApiKey = process.env.QWEN_API_KEY;
      if (!alibabaApiKey) return NextResponse.json({ error: 'Alibaba API key not configured' }, { status: 500 });
      const response = await fetch(
        `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
        { headers: { 'Authorization': `Bearer ${alibabaApiKey}` }, signal: AbortSignal.timeout(15_000) }
      );
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: 'Failed to check video status' }, { status: 502 });
      const taskStatus = data.output?.task_status as string; // PENDING | RUNNING | SUCCEEDED | FAILED
      const videoUrl = data.output?.video_url ?? null;
      if (taskStatus === 'SUCCEEDED' && videoUrl) {
        await supabaseAdmin.from('generated_videos').update({ status: 'succeed', video_url: videoUrl }).eq('task_id', taskId);
      } else if (taskStatus === 'FAILED') {
        await supabaseAdmin.from('generated_videos').update({ status: 'failed' }).eq('task_id', taskId);
      }
      const normalizedStatus = taskStatus === 'SUCCEEDED' ? 'succeed' : taskStatus === 'FAILED' ? 'failed' : 'processing';
      return NextResponse.json({ status: normalizedStatus, videoUrl, duration: null });
    }

    if (provider === 'bytedance') {
      const bdApiKey = process.env.BYTE_DANCE_API_KEY;
      if (!bdApiKey) return NextResponse.json({ error: 'ByteDance API key not configured' }, { status: 500 });

      const response = await fetch(
        `https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks/${taskId}`,
        { headers: { 'Authorization': `Bearer ${bdApiKey}` } }
      );
      const data = await response.json();
      if (!response.ok) return NextResponse.json({ error: 'Failed to check video status' }, { status: 502 });

      const status = data.status; // queued | running | succeeded | failed
      const videoUrl = data.content?.video_url ?? null;

      if (status === 'succeeded' && videoUrl) {
        await supabaseAdmin.from('generated_videos').update({ status: 'succeed', video_url: videoUrl }).eq('task_id', taskId);
      } else if (status === 'failed') {
        await supabaseAdmin.from('generated_videos').update({ status: 'failed' }).eq('task_id', taskId);
      }

      return NextResponse.json({ status: status === 'succeeded' ? 'succeed' : status, videoUrl, duration: null });
    }

    // Default: Kling
    const token = await generateKlingToken();
    const klingPath = taskType === 'motion-control'
      ? `https://api.klingai.com/v1/videos/motion-control/${taskId}`
      : `https://api.klingai.com/v1/videos/text2video/${taskId}`;
    const response = await fetch(klingPath, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    const data = await response.json();
    if (!response.ok) return NextResponse.json({ error: 'Failed to check video status' }, { status: 502 });

    const task = data.data;
    const status = task?.task_status;
    const videoUrl = task?.task_result?.videos?.[0]?.url ?? null;

    if (status === 'succeed' && videoUrl) {
      await supabaseAdmin.from('generated_videos').update({ status: 'succeed', video_url: videoUrl }).eq('task_id', taskId);
    } else if (status === 'failed') {
      await supabaseAdmin.from('generated_videos').update({ status: 'failed' }).eq('task_id', taskId);
    }

    return NextResponse.json({ status, videoUrl, duration: task?.task_result?.videos?.[0]?.duration ?? null });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to check video status' }, { status: 500 });
  }
}

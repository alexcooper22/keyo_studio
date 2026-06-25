import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { sanitizeFileName, rateLimit } from '../../../lib/rateLimit';

export const maxDuration = 30;
export const dynamic = 'force-dynamic';

const ALLOWED_MIME = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/flac',
]);

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { allowed } = rateLimit(`upload-media:${userId}`, 20, 60_000);
    if (!allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const mime = file.type.toLowerCase().split(';')[0].trim();
    if (!ALLOWED_MIME.has(mime)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large (max 50 MB)' }, { status: 413 });
    }

    const safeName = sanitizeFileName(file.name);
    const ext = safeName.split('.').pop()?.toLowerCase() ?? 'bin';
    const mediaType = mime.startsWith('image/') ? 'images' : mime.startsWith('audio/') ? 'audio' : 'video';
    const storagePath = `${userId}/${mediaType}/${Date.now()}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error: uploadError } = await supabaseAdmin.storage
      .from('video-media')
      .upload(storagePath, buffer, { contentType: mime, upsert: true });

    if (uploadError || !data) {
      console.error('[upload-media] Supabase error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('video-media')
      .getPublicUrl(storagePath);

    return NextResponse.json({ url: publicUrl });
  } catch (err: any) {
    console.error('[upload-media] Error:', err?.message);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

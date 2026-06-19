import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { isAllowedMime } from '../../../lib/rateLimit';

const ALLOWED_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp']);
const ALLOWED_VIDEO_EXT = new Set(['mp4', 'webm']);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileName, fileType } = await req.json();
  if (!fileName || !fileType) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  if (!isAllowedMime(fileType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  const baseName = fileName.split(/[\\/]/).pop() ?? '';
  const ext = (baseName.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const isVideo = ALLOWED_VIDEO_EXT.has(ext);
  const isImage = ALLOWED_IMAGE_EXT.has(ext);

  if (!isVideo && !isImage) {
    return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 });
  }

  const folder = isVideo ? 'motionvideos' : 'frames';
  const storagePath = `${userId}/${folder}/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from('user-images')
    .createSignedUploadUrl(storagePath);

  if (error || !data) return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });

  const publicUrl = supabaseAdmin.storage.from('user-images').getPublicUrl(storagePath).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
}

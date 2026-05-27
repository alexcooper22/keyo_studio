import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';
import { isAllowedMime, sanitizeFileName } from '../../../lib/rateLimit';

const ALLOWED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp']);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileName, fileType } = await req.json();
  if (!fileName || !fileType) {
    return NextResponse.json({ error: 'Missing params' }, { status: 400 });
  }

  // Validate MIME type
  if (!isAllowedMime(fileType)) {
    return NextResponse.json({ error: 'File type not allowed' }, { status: 400 });
  }

  // Sanitize filename and validate extension
  const safeName = sanitizeFileName(fileName);
  const ext = safeName.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 });
  }

  const storagePath = `${userId}/frames/${Date.now()}.${ext}`;

  const { data, error } = await supabaseAdmin.storage
    .from('user-images')
    .createSignedUploadUrl(storagePath);

  if (error || !data) return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 });

  const publicUrl = supabaseAdmin.storage.from('user-images').getPublicUrl(storagePath).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
}

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { fileName, fileType } = await req.json();
  if (!fileName || !fileType) return NextResponse.json({ error: 'Missing params' }, { status: 400 });

  const path = `${userId}/frames/${Date.now()}-${fileName}`;

  const { data, error } = await supabaseAdmin.storage
    .from('user-images')
    .createSignedUploadUrl(path);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const publicUrl = supabaseAdmin.storage.from('user-images').getPublicUrl(path).data.publicUrl;

  return NextResponse.json({ signedUrl: data.signedUrl, publicUrl });
}

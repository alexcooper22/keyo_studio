import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '../../../lib/supabase';

export const config = {
  api: {
    bodyParser: false,
    responseLimit: '20mb',
  },
};

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get('file') as File;
  const type = formData.get('type') as string;

  if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const fileName = `${userId}/${type}-${Date.now()}.${file.name.split('.').pop()}`;

  const { error } = await supabaseAdmin.storage
    .from('user-images')
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data } = supabaseAdmin.storage.from('user-images').getPublicUrl(fileName);

  return NextResponse.json({ url: data.publicUrl });
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * GET /api/community-gallery
 * Returns the last 6 public images from generated_images table.
 */
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('generated_images')
      .select('id, image_url, prompt, created_at')
      .order('created_at', { ascending: false })
      .limit(6);

    if (error) {
      console.error('[community-gallery] Supabase error:', error.message);
      return NextResponse.json([], { status: 200 });
    }

    return NextResponse.json(data ?? []);
  } catch (err) {
    console.error('[community-gallery] Unexpected error:', err);
    return NextResponse.json([], { status: 200 });
  }
}

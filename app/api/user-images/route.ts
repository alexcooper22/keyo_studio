import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ images: [] }, { status: 401 });
    }

    const { data: images, error } = await supabaseAdmin
      .from('generated_images')
      .select('*')
      .eq('clerk_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ images: images || [] });
  } catch (error) {
    console.error("Fetch images error:", error);
    return NextResponse.json({ error: "Failed to fetch images" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    const { data: image, error: fetchError } = await supabaseAdmin
      .from('generated_images')
      .select('id, image_url, clerk_id')
      .eq('id', id)
      .eq('clerk_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;
    if (!image) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Extract storage path: everything after "/user-images/"
    const bucketName = 'user-images';
    const marker = `/${bucketName}/`;
    const markerIdx = image.image_url.indexOf(marker);
    if (markerIdx !== -1) {
      const storagePath = image.image_url.slice(markerIdx + marker.length);
      await supabaseAdmin.storage.from(bucketName).remove([storagePath]);
    }

    const { error: deleteError } = await supabaseAdmin
      .from('generated_images')
      .delete()
      .eq('id', id)
      .eq('clerk_id', userId);

    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

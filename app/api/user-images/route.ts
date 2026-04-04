import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
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

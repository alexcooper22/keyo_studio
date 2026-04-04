import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ credits: 0 }, { status: 401 });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('credits')
      .eq('clerk_id', userId)
      .single();

    if (error && error.code === 'PGRST116') {
      // User doesn't exist yet in Supabase (hasn't generated anything)
      return NextResponse.json({ credits: 10 });
    }

    if (error) throw error;

    return NextResponse.json({ credits: user.credits });
  } catch (error) {
    console.error("Fetch credits error:", error);
    return NextResponse.json({ error: "Failed to fetch credits" }, { status: 500 });
  }
}

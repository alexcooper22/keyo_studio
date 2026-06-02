import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";
import { isAdmin } from "../../../lib/admin";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ credits: 0, hasSubscription: false, isAdmin: false }, { status: 401 });
    }

    // Шукаємо активну підписку
    const { data: subscription, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('credits_remaining, status, plan')
      .eq('clerk_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    const [adminStatus] = await Promise.all([isAdmin(userId)]);

    if (error) {
      console.error('Subscription fetch error:', error);
      return NextResponse.json({ credits: 0, hasSubscription: false, isAdmin: adminStatus });
    }

    if (!subscription) {
      return NextResponse.json({ credits: 0, hasSubscription: false, plan: null, isAdmin: adminStatus });
    }

    return NextResponse.json({
      credits: subscription.credits_remaining,
      hasSubscription: true,
      plan: subscription.plan,
      isAdmin: adminStatus,
    });
  } catch (error) {
    console.error("Fetch credits error:", error);
    return NextResponse.json({ error: "Failed to fetch credits", credits: 0, hasSubscription: false }, { status: 500 });
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ credits: 0, hasSubscription: false }, { status: 401 });
    }

    // Шукаємо активну підписку
    const { data: subscription, error } = await supabaseAdmin
      .from('user_subscriptions')
      .select('credits_remaining, status, plan')
      .eq('clerk_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.error('Subscription fetch error:', error);
      return NextResponse.json({ credits: 0, hasSubscription: false });
    }

    // Немає активної підписки — 0 кредитів
    if (!subscription) {
      return NextResponse.json({ credits: 0, hasSubscription: false, plan: null });
    }

    return NextResponse.json({
      credits: subscription.credits_remaining,
      hasSubscription: true,
      plan: subscription.plan,
    });
  } catch (error) {
    console.error("Fetch credits error:", error);
    return NextResponse.json({ error: "Failed to fetch credits", credits: 0, hasSubscription: false }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { stripe, STRIPE_PLANS, PlanType } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json({ error: 'Email not found' }, { status: 400 });
    }

    const { plan } = (await req.json()) as { plan: PlanType };
    if (!plan || !STRIPE_PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    const planConfig = STRIPE_PLANS[plan];

    // Перевіряємо чи є у користувача stripe_customer_id
    const { data: existingSub } = await supabaseAdmin
      .from('user_subscriptions')
      .select('stripe_customer_id')
      .eq('clerk_id', userId)
      .single();

    let customerId = existingSub?.stripe_customer_id;

    // Якщо немає — створюємо нового Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { clerk_id: userId },
      });
      customerId = customer.id;
    }

    // Створюємо Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: planConfig.priceId,
          quantity: 1,
        },
      ],
      success_url: `${req.nextUrl.origin}/pricing?success=true`,
      cancel_url: `${req.nextUrl.origin}/pricing?canceled=true`,
      metadata: {
        clerk_id: userId,
        plan,
      },
      subscription_data: {
        metadata: {
          clerk_id: userId,
          plan,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

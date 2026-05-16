import { NextRequest, NextResponse } from 'next/server';
import { stripe, STRIPE_PLANS } from '@/lib/stripe';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clerkId = session.metadata?.clerk_id;
        const plan = session.metadata?.plan as keyof typeof STRIPE_PLANS;

        if (!clerkId || !plan) break;

        const planConfig = STRIPE_PLANS[plan];
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        const periodStart = (subscription.items.data[0] as any)?.current_period_start;
        const periodEnd = (subscription.items.data[0] as any)?.current_period_end;

        if (!periodStart || !periodEnd) {
          console.error('Missing period fields in subscription', subscription.id);
          break;
        }

        await supabaseAdmin.from('user_subscriptions').upsert({
          clerk_id: clerkId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscription.id,
          plan,
          status: 'active',
          credits_remaining: planConfig.credits,
          credits_total: planConfig.credits,
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_id' });

        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkId = subscription.metadata?.clerk_id;
        const plan = subscription.metadata?.plan as keyof typeof STRIPE_PLANS;

        if (!clerkId) break;

        const planConfig = plan ? STRIPE_PLANS[plan] : null;
        const isActive = subscription.status === 'active';

        const periodStart = (subscription.items.data[0] as any)?.current_period_start;
        const periodEnd = (subscription.items.data[0] as any)?.current_period_end;

        if (!periodStart || !periodEnd) {
          console.error('Missing period fields in subscription', subscription.id);
          break;
        }

        await supabaseAdmin.from('user_subscriptions').upsert({
          clerk_id: clerkId,
          stripe_subscription_id: subscription.id,
          status: isActive ? 'active' : subscription.status,
          ...(planConfig && {
            plan,
            credits_remaining: planConfig.credits,
            credits_total: planConfig.credits,
          }),
          current_period_start: new Date(periodStart * 1000).toISOString(),
          current_period_end: new Date(periodEnd * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'clerk_id' });

        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const clerkId = subscription.metadata?.clerk_id;

        if (!clerkId) break;

        await supabaseAdmin.from('user_subscriptions')
          .update({
            status: 'canceled',
            credits_remaining: 0,
            updated_at: new Date().toISOString(),
          })
          .eq('clerk_id', clerkId);

        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

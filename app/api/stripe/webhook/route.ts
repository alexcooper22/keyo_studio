import { NextRequest, NextResponse } from 'next/server'
import { getStripe, STRIPE_PLANS, StripePlanType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'
import Stripe from 'stripe'

async function handleSubscriptionUpsert(subscription: Stripe.Subscription) {
  const clerkId = subscription.metadata?.clerk_id
  const plan = subscription.metadata?.plan as StripePlanType
  if (!clerkId || !plan || !STRIPE_PLANS[plan]) return

  const planConfig = STRIPE_PLANS[plan]
  const isActive = subscription.status === 'active' || subscription.status === 'trialing'

  if (isActive) {
    const now = new Date()
    const periodEnd = new Date((subscription as any).current_period_end * 1000)

    await supabaseAdmin.from('user_subscriptions').upsert({
      clerk_id: clerkId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: String(subscription.customer),
      plan,
      status: 'active',
      credits_remaining: planConfig.credits,
      credits_total: planConfig.credits,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'clerk_id' })
  } else {
    await supabaseAdmin.from('user_subscriptions')
      .update({ status: 'canceled', credits_remaining: 0, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id)
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const stripe = getStripe()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const { clerk_id, type, package_id, credits } = session.metadata ?? {}

      if (type === 'credits' && clerk_id && package_id && credits) {
        const creditAmount = parseInt(credits)

        await supabaseAdmin.from('credit_purchases')
          .update({ status: 'completed', liqpay_payment_id: session.payment_intent as string, updated_at: new Date().toISOString() })
          .eq('order_id', session.id)

        const { data: existing } = await supabaseAdmin
          .from('user_subscriptions')
          .select('credits_remaining, credits_total')
          .eq('clerk_id', clerk_id)
          .maybeSingle()

        if (existing) {
          await supabaseAdmin.from('user_subscriptions')
            .update({
              credits_remaining: (existing.credits_remaining ?? 0) + creditAmount,
              credits_total: (existing.credits_total ?? 0) + creditAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('clerk_id', clerk_id)
        } else {
          await supabaseAdmin.from('user_subscriptions').insert({
            clerk_id,
            plan: null,
            status: 'active',
            credits_remaining: creditAmount,
            credits_total: creditAmount,
            updated_at: new Date().toISOString(),
          })
        }
      }

      if (session.mode === 'subscription' && session.subscription) {
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        await handleSubscriptionUpsert(subscription)
      }
      break
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const subscription = event.data.object as Stripe.Subscription
      await handleSubscriptionUpsert(subscription)
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription
      await supabaseAdmin.from('user_subscriptions')
        .update({ status: 'canceled', credits_remaining: 0, updated_at: new Date().toISOString() })
        .eq('stripe_subscription_id', subscription.id)
      break
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice & { billing_reason?: string; subscription?: string | null }
      if (invoice.billing_reason === 'subscription_cycle' && invoice.subscription) {
        const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
        await handleSubscriptionUpsert(subscription)
      }
      break
    }
  }

  return NextResponse.json({ received: true })
}

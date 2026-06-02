import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhook, decodeWebhookData, LIQPAY_PLANS, LiqPayPlanType } from '@/lib/liqpay'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const data = formData.get('data') as string
  const signature = formData.get('signature') as string

  if (!data || !signature) {
    return NextResponse.json({ error: 'Missing data or signature' }, { status: 400 })
  }

  if (!verifyWebhook(data, signature)) {
    console.error('LiqPay webhook: invalid signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = decodeWebhookData(data)
  const { status, action, order_id, subscribe_id } = payload

  if (action !== 'subscribe') {
    return NextResponse.json({ received: true })
  }

  let info: { clerk_id?: string; plan?: string } = {}
  try {
    info = payload.info ? JSON.parse(payload.info) : {}
  } catch {}

  const clerkId = info.clerk_id ?? payload.customer
  const plan = (info.plan ?? order_id?.split('_')[0]) as LiqPayPlanType

  if (!clerkId || !plan || !LIQPAY_PLANS[plan]) {
    console.error('LiqPay webhook: missing clerkId or plan', { clerkId, plan, order_id })
    return NextResponse.json({ received: true })
  }

  const planConfig = LIQPAY_PLANS[plan]

  if (status === 'subscribed' || status === 'success') {
    const now = new Date()
    const periodEnd = new Date(now)
    periodEnd.setMonth(periodEnd.getMonth() + 1)

    await supabaseAdmin.from('user_subscriptions').upsert({
      clerk_id: clerkId,
      liqpay_subscribe_id: subscribe_id ?? null,
      plan,
      status: 'active',
      credits_remaining: planConfig.credits,
      credits_total: planConfig.credits,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      updated_at: now.toISOString(),
    }, { onConflict: 'clerk_id' })
  } else if (status === 'unsubscribed' || status === 'failure' || status === 'error') {
    await supabaseAdmin.from('user_subscriptions')
      .update({ status: 'canceled', credits_remaining: 0, updated_at: new Date().toISOString() })
      .eq('clerk_id', clerkId)
  }

  return NextResponse.json({ received: true })
}

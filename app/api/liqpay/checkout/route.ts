import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { buildCheckoutParams, LIQPAY_PLANS, LiqPayPlanType, PUBLIC_KEY } from '@/lib/liqpay'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 400 })

  const { plan } = (await req.json()) as { plan: LiqPayPlanType }
  if (!plan || !LIQPAY_PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planConfig = LIQPAY_PLANS[plan]
  const orderId = `${plan}_${userId}_${Date.now()}`
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin

  const { data, signature } = buildCheckoutParams({
    public_key: PUBLIC_KEY,
    version: '3',
    action: 'pay',
    amount: planConfig.amount,
    currency: planConfig.currency,
    description: `Keyo Studio — ${planConfig.name} Plan`,
    order_id: orderId,
    server_url: `${origin}/api/liqpay/webhook`,
    result_url: `${origin}/pricing?success=true`,
    customer: email,
    info: JSON.stringify({ clerk_id: userId, plan }),
  })

  return NextResponse.json({ data, signature })
}

import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getStripe, STRIPE_PLANS, StripePlanType } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 400 })

  const { plan } = (await req.json()) as { plan: StripePlanType }
  if (!plan || !STRIPE_PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  const planConfig = STRIPE_PLANS[plan]
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: `${origin}/pricing?success=true`,
    cancel_url: `${origin}/pricing`,
    metadata: { clerk_id: userId, plan },
    subscription_data: { metadata: { clerk_id: userId, plan } },
  })

  return NextResponse.json({ url: session.url })
}

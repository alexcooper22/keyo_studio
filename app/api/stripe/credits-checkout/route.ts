import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { getStripe, STRIPE_CREDIT_PACKAGES, StripeCreditPackageType } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await currentUser()
  const email = user?.emailAddresses?.[0]?.emailAddress
  if (!email) return NextResponse.json({ error: 'Email not found' }, { status: 400 })

  const { packageId } = (await req.json()) as { packageId: StripeCreditPackageType }
  if (!packageId || !STRIPE_CREDIT_PACKAGES[packageId]) {
    return NextResponse.json({ error: 'Invalid package' }, { status: 400 })
  }

  const pkg = STRIPE_CREDIT_PACKAGES[packageId]
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin
  const stripe = getStripe()

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email,
    line_items: [{ price: pkg.priceId, quantity: 1 }],
    success_url: `${origin}/credits?success=true`,
    cancel_url: `${origin}/credits`,
    metadata: { clerk_id: userId, type: 'credits', package_id: packageId, credits: String(pkg.credits) },
  })

  const { data: pkgData } = await supabaseAdmin
    .from('credit_packages')
    .select('price_usd')
    .eq('id', packageId)
    .maybeSingle()

  await supabaseAdmin.from('credit_purchases').insert({
    clerk_id: userId,
    package_id: packageId,
    credits: pkg.credits,
    price_usd: pkgData?.price_usd ?? 0,
    order_id: session.id,
    status: 'pending',
  })

  return NextResponse.json({ url: session.url })
}

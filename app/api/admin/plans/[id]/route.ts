import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import { isAdmin } from '../../../../../lib/admin'
import { invalidatePlansCache } from '../../../../../lib/plans'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const allowed = ['name', 'description', 'price_usd', 'credits', 'featured', 'cta_text', 'cta_style', 'sort_order', 'breakdown']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .update(update)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidatePlansCache()
  return NextResponse.json({ plan: data })
}

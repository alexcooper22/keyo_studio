import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../../../lib/supabase'
import { isAdmin } from '../../../../../../lib/admin'
import { invalidateModelsCache } from '../../../../../../lib/models'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { userId } = await auth()
  if (!userId || !await isAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const { quality, credits, unit, cost_usd } = body

  if (!quality || credits == null || !unit || cost_usd == null) {
    return NextResponse.json({ error: 'Missing required fields: quality, credits, unit, cost_usd' }, { status: 400 })
  }
  if (unit !== 'per_image' && unit !== 'per_second') {
    return NextResponse.json({ error: 'unit must be "per_image" or "per_second"' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('model_pricing')
    .insert({ model_id: params.id, quality, credits, unit, cost_usd })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ pricing: data }, { status: 201 })
}

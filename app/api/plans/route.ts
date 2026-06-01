import { NextResponse } from 'next/server'
import { getPlans } from '../../../lib/plans'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const plans = await getPlans()
    return NextResponse.json({ plans })
  } catch (err: any) {
    console.error('Failed to fetch plans:', err)
    return NextResponse.json({ error: 'Failed to fetch plans' }, { status: 503 })
  }
}

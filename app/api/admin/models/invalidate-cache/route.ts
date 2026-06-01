import { NextRequest, NextResponse } from 'next/server'
import { invalidateModelsCache } from '../../../../../lib/models'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expected = `Bearer ${process.env.ADMIN_SECRET}`

  if (!process.env.ADMIN_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  invalidateModelsCache()
  return NextResponse.json({ ok: true })
}

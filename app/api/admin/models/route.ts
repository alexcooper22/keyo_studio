import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { supabaseAdmin } from '../../../../lib/supabase'
import { isAdmin } from '../../../../lib/admin'
import { invalidateModelsCache } from '../../../../lib/models'

export const dynamic = 'force-dynamic'

async function checkAdmin(userId: string | null) {
  if (!userId) return false
  return isAdmin(userId)
}

export async function GET() {
  const { userId } = await auth()
  if (!await checkAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_models')
    .select('*, model_pricing(*)')
    .order('sort_order')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ models: data })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!await checkAdmin(userId)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: userId ? 403 : 401 })
  }

  const body = await request.json()
  const { name, provider, model_id, category, api_key_env, api_secret_env } = body

  if (!name || !provider || !model_id || !category || !api_key_env) {
    return NextResponse.json({ error: 'Missing required fields: name, provider, model_id, category, api_key_env' }, { status: 400 })
  }
  if (category !== 'image' && category !== 'video') {
    return NextResponse.json({ error: 'category must be "image" or "video"' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('ai_models')
    .insert({ name, provider, model_id, category, api_key_env, api_secret_env: api_secret_env || null, enabled: false })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateModelsCache()
  return NextResponse.json({ model: data }, { status: 201 })
}
